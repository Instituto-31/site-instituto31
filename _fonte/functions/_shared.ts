import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { localToUtc, ocupadosGoogle } from "./_gcal.ts";

export const ORIGENS = ["https://instituto31.pt", "https://www.instituto31.pt"];
export function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = ORIGENS.includes(o) || o.startsWith("http://localhost") || o.endsWith(".claude.ai") || o.endsWith(".claudeusercontent.com");
  return {
    "Access-Control-Allow-Origin": ok ? o : ORIGENS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  };
}
export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
export const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// data/hora atuais em Lisboa
export function agoraLisboa() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { data: `${g("year")}-${g("month")}-${g("day")}`, hora: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}` };
}
export function addDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function diaSemana(iso: string) { const w = new Date(iso + "T12:00:00Z").getUTCDay(); return w === 0 ? 7 : w; }

export const DIAS_AGENDA = 21;
export const MIN_ANTECEDENCIA_MIN = 60;
export const SLOT_MIN = 75;
export function slotUtc(data: string, hora: string) { const [y, m, d] = data.split("-").map(Number); const [h, mi] = hora.split(":").map(Number); return localToUtc(y, m, d, h, mi); }

// Agenda: horas configuradas e livres por dia
export async function agenda(sb: ReturnType<typeof db>) {
  const hoje = agoraLisboa();
  const fim = addDias(hoje.data, DIAS_AGENDA);
  await sb.from("marcacoes_psi").update({ estado: "expirado" }).eq("estado", "pendente").lt("created_at", new Date(Date.now() - 6 * 60000).toISOString());
  const [{ data: hs }, { data: fer }, { data: bl }, { data: ms }] = await Promise.all([
    sb.from("psi_horarios").select("dia_semana,hora").eq("ativo", true),
    sb.from("feriados").select("data").gte("data", hoje.data).lte("data", fim),
    sb.from("psi_bloqueios").select("data,hora").gte("data", hoje.data).lte("data", fim),
    sb.from("marcacoes_psi").select("data,hora").in("estado", ["pendente", "pago"]).gte("data", hoje.data).lte("data", fim),
  ]);
  const feriados = new Set((fer ?? []).map((f) => f.data));
  const google = await ocupadosGoogle(slotUtc(hoje.data, "00:00"), slotUtc(addDias(fim, 1), "00:00"));
  const dias: { data: string; horas: string[]; livres: string[] }[] = [];
  for (let i = 0; i <= DIAS_AGENDA; i++) {
    const d = addDias(hoje.data, i);
    const horas = (hs ?? []).filter((h) => h.dia_semana === diaSemana(d)).map((h) => String(h.hora).slice(0, 5)).sort();
    if (!horas.length || feriados.has(d)) continue;
    const livres = horas.filter((h) => {
      if ((bl ?? []).some((b) => b.data === d && (!b.hora || String(b.hora).slice(0, 5) === h))) return false;
      if ((ms ?? []).some((m) => m.data === d && String(m.hora).slice(0, 5) === h)) return false;
      const s0 = slotUtc(d, h), s1 = s0 + SLOT_MIN * 60000;
      if (google.some((g) => g.start < s1 && g.end > s0)) return false;
      if (d === hoje.data) {
        const [hh, mm] = h.split(":").map(Number), [nh, nm] = hoje.hora.split(":").map(Number);
        if (hh * 60 + mm - (nh * 60 + nm) < MIN_ANTECEDENCIA_MIN) return false;
      }
      return true;
    });
    dias.push({ data: d, horas, livres });
  }
  return dias;
}

export function preco(lingua: string, formando: boolean) { return lingua !== "pt" ? 70 : formando ? 25 : 35; }

export async function enviarEmail(sb: ReturnType<typeof db>, para: { email: string; name?: string }[], assunto: string, html: string, tipo: string, extra: Record<string, unknown> = {}, anexos: { name: string; content: string }[] = []) {
  const key = Deno.env.get("BREVO_API_KEY");
  let estado = "erro", messageId: string | null = null;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: para, subject: assunto, htmlContent: html, ...(anexos.length ? { attachment: anexos } : {}) }),
    });
    const j = await r.json().catch(() => ({}));
    estado = r.ok ? "enviado" : "erro";
    messageId = j.messageId ?? null;
  } catch (_) { /* registado como erro */ }
  await sb.from("emails_log").insert({ tipo, para: para.map((p) => p.email), assunto, estado, message_id: messageId, ...extra });
  return estado === "enviado";
}

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function moldura(titulo: string, corpo: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:16px;padding:28px">
<p style="margin:0 0 4px;color:#0670C2;font-weight:700">Instituto 31</p>
<h1 style="margin:0 0 16px;font-size:24px">${titulo}</h1>${corpo}
</div>
<p style="font-size:12px;color:#555B63;text-align:center;margin:16px 0 0">Instituto 31 · Rua Dr. João Afonso de Almeida 315, Guimarães · 916 31 31 31 · geral@instituto31.pt</p>
</div></body></html>`;
}
