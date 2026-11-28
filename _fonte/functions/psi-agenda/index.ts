import { agenda, cors, db, json } from "./_agenda.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try { return json(req, { dias: await agenda(db()) }); }
  catch (e) { console.error(e); return json(req, { erro: "agenda indisponível" }, 500); }
});
