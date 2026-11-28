import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };

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
export const db = () => createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });

export async function enviarEmail(sb: ReturnType<typeof db>, para: { email: string; name?: string }[], assunto: string, html: string, tipo: string, extra: Record<string, unknown> = {}) {
  const key = Deno.env.get("BREVO_API_KEY");
  let estado = "erro", messageId: string | null = null;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: para, subject: assunto, htmlContent: html }),
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
