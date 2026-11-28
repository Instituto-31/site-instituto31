// Link "Não quero receber mais avisos": marca a pessoa como opt_out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };

const pagina = (titulo: string, txt: string) => new Response(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;color:#111"><div style="max-width:480px;margin:60px auto;background:#fff;border-radius:16px;padding:28px">
<p style="margin:0 0 4px;color:#0670C2;font-weight:700">Instituto 31</p><h1 style="margin:0 0 12px;font-size:22px">${titulo}</h1><p style="font-size:15px;line-height:23px;color:#555B63">${txt}</p>
<p style="margin-top:22px"><a href="https://instituto31.pt" style="color:#0670C2">instituto31.pt</a></p></div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const te = u.searchParams.get("e") ?? "";
  if (te) {
    if (!/^[0-9a-f-]{36}$/.test(te)) return pagina("Link inválido", "Este link não é válido. Se não quiser receber mais propostas, responda ao nosso email a pedir.");
    const sbE = createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
    const { data: de } = await sbE.from("empresas").update({ opt_out: true, estado: "sair" }).eq("token", te).select("id");
    if (!de || !de.length) return pagina("Link inválido", "Não encontrámos o registo. Se não quiser receber mais propostas, responda ao nosso email a pedir.");
    return pagina("Feito", "A sua empresa não vai receber mais propostas do Instituto 31. Obrigado.");
  }
  const t = u.searchParams.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(t)) return pagina("Link inválido", "Este link não é válido. Se quiser deixar de receber avisos, responda a qualquer email nosso a pedir.");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
  const { data } = await sb.from("pessoas").update({ opt_out: true, opt_out_data: new Date().toISOString() }).eq("token_saida", t).select("id");
  if (!data || !data.length) return pagina("Link inválido", "Não encontrámos o seu registo. Se quiser deixar de receber avisos, responda a qualquer email nosso a pedir.");
  return pagina("Feito", "Não vai receber mais avisos de renovação do Instituto 31. Se mudar de ideias, fale connosco pelo 916 31 31 31.");
});
