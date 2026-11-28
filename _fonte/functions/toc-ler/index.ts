// Acesso de administração ao TOConline, protegido por x-admin.
// GET: só leitura. POST: apenas para criar serviços (caminho "services").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };
import { adminOk, toc } from "./_toc.ts";
import { emitirFatura } from "./_fatura.ts";

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
const POST_PERMITIDOS = ["services"];

Deno.serve(async (req) => {
  const sb = db();
  if (!(await adminOk(sb, req))) return new Response("nao", { status: 403 });
  const caminho = new URL(req.url).searchParams.get("p") || "";
  if (!/^[a-z0-9_\/\[\]=&?.%-]+$/i.test(caminho)) return new Response("caminho invalido", { status: 400 });
  try {
    let r;
    if (req.method === "POST" && caminho === "__fatura_teste") {
      // emite a fatura de uma marcação já paga, com o modo indicado (rascunho/final)
      const b = await req.json();
      const { data: m } = await sb.from("marcacoes_psi").select("*").eq("id", b.id).single();
      if (!m || m.estado === "pendente") return new Response("marcacao invalida", { status: 400 });
      const res = await emitirFatura(sb, m, b.modo === "final" ? "final" : "rascunho");
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
    }
    if (req.method === "POST" && caminho === "__apagar_rascunho") {
      // só apaga documentos em preparação (o TOConline recusa os finalizados)
      const b = await req.json();
      const r = await toc(sb, "DELETE", `commercial_sales_documents/${Number(b.doc)}`);
      return new Response(JSON.stringify({ status: r.status, dados: r.json ?? r.texto.slice(0, 500) }), { headers: { "Content-Type": "application/json" } });
    }
    if (req.method === "POST") {
      if (!POST_PERMITIDOS.includes(caminho)) return new Response("escrita nao permitida", { status: 403 });
      r = await toc(sb, "POST", caminho, await req.json());
    } else {
      r = await toc(sb, "GET", caminho);
    }
    return new Response(JSON.stringify({ status: r.status, dados: r.json ?? r.texto.slice(0, 3000) }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
