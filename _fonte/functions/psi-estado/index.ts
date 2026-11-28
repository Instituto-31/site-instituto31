import { cors, db, json, verificarPagamento } from "./_shared.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json(req, { erro: "id" }, 400);
  const sb = db();
  const { data: m } = await sb.from("marcacoes_psi").select("*").eq("id", id).single();
  if (!m) return json(req, { erro: "não encontrado" }, 404);
  return json(req, { estado: await verificarPagamento(sb, m) });
});
