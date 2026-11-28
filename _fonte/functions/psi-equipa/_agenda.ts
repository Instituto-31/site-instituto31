import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const ORIGENS = ["https://instituto31.pt", "https://www.instituto31.pt"];
export function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = ORIGENS.includes(o) || o.startsWith("http://localhost");
  return { "Access-Control-Allow-Origin": ok ? o : ORIGENS[0], "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Vary": "Origin" };
}
export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
export const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

function tzOffsetMs(tz: string, utcMs: number) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
}
function localToUtc(y: number, mo: number, d: number, h: number, mi: number, tz = "Europe/Lisbon") {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMs(tz, guess);
  return guess - tzOffsetMs(tz, guess - off);
}
async function ocupadosGoogle(from: number, to: number) {
  const su = Deno.env.get("GCAL_SCRIPT_URL"), tk = Deno.env.get("GCAL_SCRIPT_TOKEN");
  if (!su || !tk) return [];
  try {
    const r = await fetch(`${su}?token=${encodeURIComponent(tk)}&from=${from}&to=${to}`, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    const j = await r.json();
    if (Array.isArray(j)) return j.map((x: { s: number; e: number }) => ({ start: x.s, end: x.e }));
    console.error("gcal script", j);
  } catch (e) { console.error("gcal script", e); }
  return [];
}

export function agoraLisboa() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { data: `${g("year")}-${g("month")}-${g("day")}`, hora: `${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}` };
}
export function addDias(iso: string, n: number) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function diaSemana(iso: string) { const w = new Date(iso + "T12:00:00Z").getUTCDay(); return w === 0 ? 7 : w; }
export const DIAS_AGENDA = 21, MIN_ANTECEDENCIA_MIN = 60, SLOT_MIN = 60;
export function slotUtc(data: string, hora: string) { const [y, m, d] = data.split("-").map(Number); const [h, mi] = hora.split(":").map(Number); return localToUtc(y, m, d, h, mi); }
export function preco(lingua: string, formando: boolean) { return lingua !== "pt" ? 70 : formando ? 25 : 35; }

async function verificarPendentes(sb: ReturnType<typeof db>) {
  const { data: velhos } = await sb.from("marcacoes_psi").select("id").eq("estado", "pendente").lt("created_at", new Date(Date.now() - 6 * 60000).toISOString());
  for (const v of velhos ?? []) {
    try { await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/psi-estado?id=${v.id}`, { signal: AbortSignal.timeout(15000) }); } catch (e) { console.error("verificar", e); }
  }
}

export async function agenda(sb: ReturnType<typeof db>) {
  const hoje = agoraLisboa();
  const fim = addDias(hoje.data, DIAS_AGENDA);
  await verificarPendentes(sb);
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
