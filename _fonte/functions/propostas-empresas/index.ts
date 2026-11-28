// Propostas a empresas: corre nos dias úteis (pg_cron) e envia um lote às empresas
// aprovadas pela Flávia que ainda não receberam. ?simular=1 mostra quantas sairiam.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { emailEmpresa } from "./modelo.ts";
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };
const LOTE = 40;

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
  const simular = new URL(req.url).searchParams.get("simular") === "1";
  const { data: es } = await sb.from("empresas").select("id,nome,email,token,trabalhadores,grupo,distrito")
    .eq("aprovado", true).eq("estado", "por_enviar").eq("opt_out", false).not("email", "is", null)
    .order("grupo", { ascending: true }).order("trabalhadores", { ascending: false, nullsFirst: false }).limit(LOTE);
  const lista = (es ?? []).filter((x) => /@/.test(x.email ?? ""));
  if (simular) {
    const { count } = await sb.from("empresas").select("id", { count: "exact", head: true }).eq("aprovado", true).eq("estado", "por_enviar").eq("opt_out", false);
    return new Response(JSON.stringify({ hoje: lista.length, por_enviar: count ?? 0 }), { headers: { "Content-Type": "application/json" } });
  }
  let enviados = 0, erros = 0;
  for (const x of lista) {
    const m = emailEmpresa(x.nome, `${Deno.env.get("SUPABASE_URL")}/functions/v1/lembretes-sair?e=${x.token}`, x.grupo === "cliente_antigo", !x.distrito || x.distrito === "Norte");
    let ok = false, messageId: string | null = null;
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: "Flávia Corrêa · Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Flávia Corrêa" }, to: [{ email: x.email, name: x.nome }], subject: m.assunto, htmlContent: m.html, tags: ["proposta-empresas"] }),
      });
      const j = await r.json().catch(() => ({}));
      ok = r.ok; messageId = j.messageId ?? null;
    } catch (_) { /* registado */ }
    await sb.from("empresas").update(ok ? { estado: "enviado", enviado_em: new Date().toISOString(), message_id: messageId } : { estado: "erro" }).eq("id", x.id);
    await sb.from("emails_log").insert({ tipo: "proposta_empresa", para: [x.email], assunto: m.assunto, estado: ok ? "enviado" : "erro", message_id: messageId });
    if (ok) enviados++; else erros++;
    await new Promise((r) => setTimeout(r, 1500)); // espaçar os envios
  }
  return new Response(JSON.stringify({ enviados, erros }), { headers: { "Content-Type": "application/json" } });
});
