import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };
import { convite, criarEventoGoogle, localToUtc } from "./_gcal.ts";
import { emailConfirmacao, emailEquipa, moldura as molduraNova } from "./_email.ts";
import { emitirFatura } from "./_fatura.ts";

export const ORIGENS = ["https://instituto31.pt", "https://www.instituto31.pt"];
export function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = ORIGENS.includes(o) || o.startsWith("http://localhost");
  return { "Access-Control-Allow-Origin": ok ? o : ORIGENS[0], "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Vary": "Origin" };
}
export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
export const db = () => createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
export const SLOT_MIN = 60;
export function slotUtc(data: string, hora: string) { const [y, m, d] = data.split("-").map(Number); const [h, mi] = hora.split(":").map(Number); return localToUtc(y, m, d, h, mi); }

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

const STATUS_URL = "https://api.ifthenpay.com/spg/payment/mbway/status";
const AGENDA = "coordenacao@instituto31.pt";
const L: Record<string, string> = { pt: "Português", en: "English", fr: "Français" };
function dataPt(d: string) { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }
// deno-lint-ignore no-explicit-any
export async function verificarPagamento(sb: ReturnType<typeof db>, m: any): Promise<string> {
  const id = m.id;
  if (m.estado !== "pendente") return m.estado;
  if (!m.request_id) {
    if (Date.now() - new Date(m.created_at).getTime() > 6 * 60000) { await sb.from("marcacoes_psi").update({ estado: "expirado" }).eq("id", id).eq("estado", "pendente"); return "expirado"; }
    return "pendente";
  }
  const u = `${STATUS_URL}?mbWayKey=${encodeURIComponent(Deno.env.get("IFTHENPAY_MBWAY_KEY")!)}&requestId=${encodeURIComponent(m.request_id)}`;
  const j = await fetch(u).then((r) => r.json()).catch(() => ({}));
  let novo: string | null = null;
  if (j.Status === "000") novo = "pago";
  else if (j.Status === "020" || j.Status === "122") novo = "recusado";
  else {
    const idade = Date.now() - new Date(m.created_at).getTime();
    if (j.Status === "101" || (j.Status && idade > 6 * 60000) || idade > 30 * 60000) novo = "expirado";
  }
  if (!novo) return "pendente";
  const upd: Record<string, unknown> = { estado: novo };
  if (novo === "pago") upd.pago_em = new Date().toISOString();
  const { data: rows } = await sb.from("marcacoes_psi").update(upd).eq("id", id).eq("estado", "pendente").select("id");
  if (novo === "pago" && rows && rows.length) {
    if (m.email) { const c = emailConfirmacao(m); await enviarEmail(sb, [{ email: m.email, name: m.nome }], c.assunto, c.html, "psi_confirmacao"); }
    { const q = emailEquipa(m); await enviarEmail(sb, [{ email: "geral@instituto31.pt", name: "Instituto 31" }], q.assunto, q.html, "psi_aviso_equipa"); }
    const ini = slotUtc(m.data, String(m.hora).slice(0, 5));
    const dur = SLOT_MIN;
    const titulo = `Psicotécnico (site) – ${m.nome}`;
    const descricao = `${m.nome}\nTel: ${m.telemovel}\nEmail: ${m.email ?? "-"}\n${m.tipo === "renovacao" ? "Renovação" : "Obtenção"} · ${L[m.lingua]}${m.formando ? " · formando (código " + (m.codigo ?? "") + ")" : ""}\nPago ${m.valor} € MB WAY (${m.order_id})\nFatura: rascunho na série WEB do TOConline.`;
    const local = "Instituto 31, Rua Dr. João Afonso de Almeida 315, Guimarães";
    const criado = await criarEventoGoogle({ id: m.id, titulo, descricao, inicio: ini, fim: ini + dur * 60000, local });
    if (!criado) {
      const ics = convite({ uid: m.id, inicioUtc: ini, fimUtc: ini + dur * 60000, para: AGENDA, titulo, descricao, local });
      const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(ics)));
      await enviarEmail(sb, [{ email: AGENDA, name: "Agenda Instituto 31" }], `Agenda: psicotécnico ${dataPt(m.data)} ${String(m.hora).slice(0, 5)} – ${m.nome}`,
        molduraNova("Marcação para a agenda", `<p>${esc(m.nome)} · ${esc(m.telemovel)}</p><p>${esc(dataPt(m.data))} às ${esc(String(m.hora).slice(0, 5))}</p><p>Abra o convite em anexo para a juntar à agenda.</p>`),
        "psi_convite_agenda", {}, [{ name: "convite.ics", content: b64 }]);
    }
    try { await emitirFatura(sb, { ...m, estado: "pago" }); } catch (_) { /* registado em fatura_erro */ }
  }
  return novo;
}
