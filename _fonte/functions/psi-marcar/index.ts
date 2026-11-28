import { agenda, cors, db, json, preco } from "./_agenda.ts";
const MBWAY_URL = "https://api.ifthenpay.com/spg/payment/mbway";
function nifValido(n: string): boolean {
  if (!/^[1235689]\d{8}$/.test(n) && !/^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 8; i++) s += Number(n[i]) * (9 - i);
  const r = s % 11;
  return (r < 2 ? 0 : 11 - r) === Number(n[8]);
}
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
    const codigo = String(b.codigo ?? "").trim().toUpperCase().slice(0, 20);
    if (formando && !/^I31-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return json(req, { erro: "Escreva o seu código de formando (ex.: I31-ABCD-1234)." }, 400);
    if (nome.length < 3 || !/^9\d{8}$/.test(tel) || b.rgpd !== true) return json(req, { erro: "Dados em falta." }, 400);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { erro: "Email inválido." }, 400);
    const nif = String(b.nif ?? "").replace(/\D/g, "").slice(0, 9);
    if (nif && !nifValido(nif)) return json(req, { erro: lingua === "fr" ? "NIF invalide." : lingua === "en" ? "Invalid tax number (NIF)." : "NIF inválido. Confirme os 9 dígitos ou deixe em branco." }, 400);
    const dias = await agenda(sb);
    const dia = dias.find((d) => d.data === b.data);
    if (!dia || !dia.livres.includes(b.hora)) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
    const { count } = await sb.from("marcacoes_psi").select("id", { count: "exact", head: true }).eq("telemovel", tel).eq("estado", "pendente");
    if ((count ?? 0) >= 3) return json(req, { erro: "Já tem pedidos pendentes. Aguarde uns minutos." }, 429);
    const valor = preco(lingua, formando);
    const orderId = "PSI" + Date.now().toString(36).toUpperCase();
    const { data: m, error } = await sb.from("marcacoes_psi").insert({
      data: b.data, hora: b.hora, tipo, lingua, formando, nome, telemovel: tel, email: email || null, nif: nif || null, valor,
      order_id: orderId, codigo: formando ? codigo : null, consent_marketing: !!b.marketing, consent_rgpd_em: new Date().toISOString(),
    }).select("id").single();
    if (error) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
    if (formando) {
      const { data: ok } = await sb.rpc("reservar_codigo_formando", { p_codigo: codigo, p_marcacao: m.id });
      if (!ok) {
        await sb.from("marcacoes_psi").update({ estado: "cancelado", obs: "código de formando inválido ou já usado" }).eq("id", m.id);
        return json(req, { erro: "Esse código de formando não é válido ou já foi usado. Pode marcar sem o desconto (35 €)." }, 400);
      }
    }
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
