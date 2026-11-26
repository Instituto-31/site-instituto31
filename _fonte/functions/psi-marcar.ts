import { agenda, cors, db, json, preco } from "./_shared.ts";
const MBWAY_URL = "https://api.ifthenpay.com/spg/payment/mbway";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "método" }, 405);
  const sb = db();
  try {
    const b = await req.json();
    const nome = String(b.nome ?? "").trim().slice(0, 120);
    const tel = String(b.telemovel ?? "").replace(/\D/g, "").replace(/^351(?=9\d{8}$)/, "");
    const email = String(b.email ?? "").trim().slice(0, 100);
    const lingua = ["pt", "en", "fr"].includes(b.lingua) ? b.lingua : "pt";
    const tipo = b.tipo === "renovacao" ? "renovacao" : "obtencao";
    const formando = lingua === "pt" && !!b.formando;
    if (nome.length < 3 || !/^9\d{8}$/.test(tel) || b.rgpd !== true) return json(req, { erro: "Dados em falta." }, 400);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { erro: "Email inválido." }, 400);
    const dias = await agenda(sb);
    const dia = dias.find((d) => d.data === b.data);
    if (!dia || !dia.livres.includes(b.hora)) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
    // limite simples anti-abuso: 3 pedidos pendentes por telemóvel
    const { count } = await sb.from("marcacoes_psi").select("id", { count: "exact", head: true }).eq("telemovel", tel).eq("estado", "pendente");
    if ((count ?? 0) >= 3) return json(req, { erro: "Já tem pedidos pendentes. Aguarde uns minutos." }, 429);
    const valor = preco(lingua, formando);
    const orderId = "PSI" + Date.now().toString(36).toUpperCase();
    const { data: m, error } = await sb.from("marcacoes_psi").insert({
      data: b.data, hora: b.hora, tipo, lingua, formando, nome, telemovel: tel, email: email || null, valor,
      order_id: orderId, consent_marketing: !!b.marketing, consent_rgpd_em: new Date().toISOString(),
    }).select("id").single();
    if (error) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
    const r = await fetch(MBWAY_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mbWayKey: Deno.env.get("IFTHENPAY_MBWAY_KEY"), orderId, amount: valor.toFixed(2), mobileNumber: "351#" + tel, email: email, description: `Psicotecnico ${b.data} ${b.hora}`.slice(0, 100) }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.Status !== "000" || !j.RequestId) {
      await sb.from("marcacoes_psi").update({ estado: "recusado", obs: `MBWAY ${j.Status ?? r.status}: ${j.Message ?? ""}` }).eq("id", m.id);
      return json(req, { erro: "O MB WAY não aceitou o pedido. Confirme o número (tem de ter MB WAY ativo)." }, 502);
    }
    await sb.from("marcacoes_psi").update({ request_id: j.RequestId }).eq("id", m.id);
    return json(req, { id: m.id, valor, estado: "pendente" });
  } catch (e) { console.error(e); return json(req, { erro: "Erro inesperado." }, 500); }
});
