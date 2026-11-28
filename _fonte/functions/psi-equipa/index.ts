// Página da equipa: ver a agenda e marcar psicotécnicos em nome do cliente,
// enviando o pedido MB WAY diretamente para o telemóvel dele.
// Protegido pela chave da equipa (segredo EQUIPA_CHAVE), enviada no corpo do pedido.
import { addDias, agenda, agoraLisboa, cors, db, json, preco } from "./_agenda.ts";
const MBWAY_URL = "https://api.ifthenpay.com/spg/payment/mbway";

function nifValido(n: string): boolean {
  if (!/^[1235689]\d{8}$/.test(n) && !/^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 8; i++) s += Number(n[i]) * (9 - i);
  const r = s % 11;
  return (r < 2 ? 0 : 11 - r) === Number(n[8]);
}
function igual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "método" }, 405);
  const sb = db();
  try {
    const b = await req.json().catch(() => ({}));
    const chave = (Deno.env.get("EQUIPA_CHAVE") ?? "").trim();
    if (!igual(String(b.chave ?? "").trim(), chave)) {
      await new Promise((r) => setTimeout(r, 1200));
      return json(req, { erro: "Palavra-passe errada." }, 401);
    }

    if (b.acao === "entrar") return json(req, { ok: true });

    if (b.acao === "agenda") {
      const dias = await agenda(sb);
      const hoje = agoraLisboa().data;
      const { data: ms } = await sb.from("marcacoes_psi")
        .select("id,data,hora,nome,telemovel,estado,tipo,lingua,valor,obs")
        .in("estado", ["pendente", "pago"]).gte("data", hoje).lte("data", addDias(hoje, 21))
        .order("data").order("hora");
      return json(req, { dias, marcacoes: ms ?? [] });
    }

    if (b.acao === "marcar") {
      const nome = String(b.nome ?? "").trim().slice(0, 120);
      const tel = String(b.telemovel ?? "").replace(/\D/g, "").replace(/^351(?=9\d{8}$)/, "");
      const email = String(b.email ?? "").trim().slice(0, 100);
      const lingua = ["pt", "en", "fr"].includes(b.lingua) ? b.lingua : "pt";
      const tipo = b.tipo === "renovacao" ? "renovacao" : "obtencao";
      const formando = lingua === "pt" && !!b.formando;
      const codigo = String(b.codigo ?? "").trim().toUpperCase().slice(0, 20);
      if (nome.length < 3) return json(req, { erro: "Escreva o nome completo do cliente." }, 400);
      if (!/^9\d{8}$/.test(tel)) return json(req, { erro: "O telemóvel tem de ter 9 dígitos e começar por 9 (o número com MB WAY)." }, 400);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { erro: "O email não parece válido." }, 400);
      const nif = String(b.nif ?? "").replace(/\D/g, "").slice(0, 9);
      if (nif && !nifValido(nif)) return json(req, { erro: "NIF inválido. Confirme os 9 dígitos ou deixe em branco." }, 400);
      if (formando && codigo && !/^I31-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return json(req, { erro: "O código de formando tem o formato I31-XXXX-XXXX (ou deixe em branco)." }, 400);
      const dias = await agenda(sb);
      const dia = dias.find((d) => d.data === b.data);
      if (!dia || !dia.livres.includes(b.hora)) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
      const valor = preco(lingua, formando);
      const orderId = "PSI" + Date.now().toString(36).toUpperCase();
      const { data: m, error } = await sb.from("marcacoes_psi").insert({
        data: b.data, hora: b.hora, tipo, lingua, formando, nome, telemovel: tel, email: email || null, nif: nif || null, valor,
        order_id: orderId, codigo: formando && codigo ? codigo : null, consent_marketing: false, consent_rgpd_em: new Date().toISOString(),
        obs: "Marcado pela equipa (WhatsApp/telefone)",
      }).select("id").single();
      if (error) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
      if (formando && codigo) {
        const { data: ok } = await sb.rpc("reservar_codigo_formando", { p_codigo: codigo, p_marcacao: m.id });
        if (!ok) {
          await sb.from("marcacoes_psi").update({ estado: "cancelado", obs: "código de formando inválido ou já usado" }).eq("id", m.id);
          return json(req, { erro: "Esse código de formando não é válido ou já foi usado." }, 400);
        }
      }
      const r = await fetch(MBWAY_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mbWayKey: Deno.env.get("IFTHENPAY_MBWAY_KEY"), orderId, amount: valor.toFixed(2), mobileNumber: "351#" + tel, email, description: `Psicotecnico ${b.data} ${b.hora}`.slice(0, 100) }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.Status !== "000" || !j.RequestId) {
        await sb.from("marcacoes_psi").update({ estado: "recusado", obs: `Equipa · MBWAY ${j.Status ?? r.status}: ${j.Message ?? ""}` }).eq("id", m.id);
        return json(req, { erro: "O MB WAY não aceitou o pedido. Confirme o número: tem de ser o telemóvel com MB WAY ativo." }, 502);
      }
      await sb.from("marcacoes_psi").update({ request_id: j.RequestId }).eq("id", m.id);
      return json(req, { id: m.id, valor, estado: "pendente" });
    }

    return json(req, { erro: "ação desconhecida" }, 400);
  } catch (e) { console.error(e); return json(req, { erro: "Erro inesperado. Tente de novo." }, 500); }
});
