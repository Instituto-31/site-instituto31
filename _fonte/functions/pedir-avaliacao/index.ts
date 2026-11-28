// Pedido de avaliação no Google: corre todos os dias (pg_cron) e escreve a quem
// teve consulta ontem ou concluiu uma formação nos últimos 7 dias. Cada pessoa só recebe este pedido uma vez.
// ?simular=1 mostra quem receberia, sem enviar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { emailAvaliacao } from "./_modelo.ts";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };

function ontemLisboa() {
  const d = new Date(Date.now() - 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
  const simular = new URL(req.url).searchParams.get("simular") === "1";
  const ontem = ontemLisboa();
  type C = { email: string; nome: string; pessoa_id: string | null; formacao?: string | null };
  const cand: C[] = [];
  // marcações do site dadas como realizadas
  const { data: ms } = await sb.from("marcacoes_psi").select("nome,email,pessoa_id").eq("data", ontem).eq("estado", "realizado");
  for (const m of ms ?? []) if (/@/.test(m.email ?? "")) cand.push({ email: m.email, nome: m.nome, pessoa_id: m.pessoa_id });
  // consultas registadas na Gestão (também as que não vieram do site)
  const { data: cs } = await sb.from("consultas_psi").select("pessoa_id,pessoas(nome,email)").eq("data", ontem);
  // deno-lint-ignore no-explicit-any
  for (const c of (cs ?? []) as any[]) if (c.pessoas && /@/.test(c.pessoas.email ?? "")) cand.push({ email: c.pessoas.email, nome: c.pessoas.nome, pessoa_id: c.pessoa_id });

  // formações concluídas (registadas na Gestão com a data real) nos últimos 7 dias
  const NOME_F: Record<string, string> = { cam: "CAM", tvde: "TVDE", adr: "ADR", tcc: "de Transporte Coletivo de Crianças", cmt: "de Motorista de Táxi" };
  const semana = new Date(Date.parse(ontem + "T12:00:00Z") - 6 * 86400000).toISOString().slice(0, 10);
  const { data: fs } = await sb.from("certificados").select("pessoa_id,tipo,pessoas(nome,email)").eq("origem", "gestao").gte("concluido_em", semana).lte("concluido_em", ontem);
  // deno-lint-ignore no-explicit-any
  for (const c of (fs ?? []) as any[]) if (c.pessoas && /@/.test(c.pessoas.email ?? "")) cand.push({ email: c.pessoas.email, nome: c.pessoas.nome, pessoa_id: c.pessoa_id, formacao: NOME_F[c.tipo] ?? c.tipo });

  // um pedido por email, e nunca a quem já recebeu ou pediu para não receber
  const vistos = new Set<string>();
  const unicos = cand.filter((c) => { const k = c.email.trim().toLowerCase(); if (vistos.has(k)) return false; vistos.add(k); return true; });
  const { data: ja } = await sb.from("emails_log").select("para").eq("tipo", "avaliacao").eq("estado", "enviado");
  const jaPedido = new Set((ja ?? []).flatMap((x) => (x.para ?? []).map((p: string) => p.trim().toLowerCase())));
  const ids = unicos.map((c) => c.pessoa_id).filter(Boolean) as string[];
  const { data: ps } = ids.length ? await sb.from("pessoas").select("id,opt_out,token_saida").in("id", ids) : { data: [] };
  const P = new Map((ps ?? []).map((p) => [p.id, p]));
  const enviar = unicos.filter((c) => !jaPedido.has(c.email.trim().toLowerCase()) && !(c.pessoa_id && P.get(c.pessoa_id)?.opt_out));

  if (simular) return new Response(JSON.stringify({ ontem, candidatos: cand.length, a_enviar: enviar.length }), { headers: { "Content-Type": "application/json" } });

  let enviados = 0, erros = 0;
  for (const c of enviar) {
    const tok = c.pessoa_id ? P.get(c.pessoa_id)?.token_saida : null;
    const m = emailAvaliacao(c.nome, tok ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/lembretes-sair?t=${tok}` : null, c.formacao ?? null);
    let ok = false, messageId: string | null = null;
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: [{ email: c.email, name: c.nome }], subject: m.assunto, htmlContent: m.html }),
      });
      const j = await r.json().catch(() => ({}));
      ok = r.ok; messageId = j.messageId ?? null;
    } catch (_) { /* registado abaixo */ }
    await sb.from("emails_log").insert({ tipo: "avaliacao", para: [c.email], assunto: m.assunto, estado: ok ? "enviado" : "erro", message_id: messageId, pessoa_id: c.pessoa_id });
    if (ok) enviados++; else erros++;
  }
  return new Response(JSON.stringify({ ontem, enviados, erros }), { headers: { "Content-Type": "application/json" } });
});
