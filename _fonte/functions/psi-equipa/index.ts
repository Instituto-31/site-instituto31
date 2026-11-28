// Página da equipa: ver a agenda e marcar psicotécnicos em nome do cliente,
// enviando o pedido MB WAY diretamente para o telemóvel dele.
// Protegido pela chave da equipa (segredo EQUIPA_CHAVE), enviada no corpo do pedido.
import { addDias, agenda, agoraLisboa, db, preco } from "./_agenda.ts";
const ORIGENS = ["https://instituto31.pt", "https://www.instituto31.pt", "https://gestao.instituto31.pt"];
function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const ok = ORIGENS.includes(o) || o.startsWith("http://localhost");
  return { "Access-Control-Allow-Origin": ok ? o : ORIGENS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Vary": "Origin" };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
// deno-lint-ignore no-explicit-any
async function membroEquipa(sb: any, req: Request): Promise<{ nome: string; email: string } | null> {
  const tok = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!tok || tok.split(".").length !== 3) return null;
  const { data } = await sb.auth.getUser(tok);
  const u = data?.user;
  if (!u?.email || !u.email_confirmed_at) return null;
  const { data: e } = await sb.from("equipa").select("nome,email,ativo").ilike("email", u.email).maybeSingle();
  return e && e.ativo ? { nome: e.nome, email: e.email } : null;
}
async function apagarEventoGoogle(id: string, data: string) {
  const su = Deno.env.get("GCAL_SCRIPT_URL"), tk = Deno.env.get("GCAL_SCRIPT_TOKEN");
  if (!su || !tk) return false;
  try {
    const r = await fetch(`${su}?token=${encodeURIComponent(tk)}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ acao: "apagar", id, data }), redirect: "follow", signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    return !!j.ok;
  } catch (_) { return false; }
}
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
    const membro = await membroEquipa(sb, req);
    if (!membro && !igual(String(b.chave ?? "").trim(), chave)) {
      await new Promise((r) => setTimeout(r, 1200));
      return json(req, { erro: "Palavra-passe errada." }, 401);
    }
    const quem = membro?.nome ?? "equipa";

    if (b.acao === "entrar") return json(req, { ok: true });

    if (b.acao === "agenda") {
      const dias = await agenda(sb);
      const hoje = agoraLisboa().data;
      const { data: ms } = await sb.from("marcacoes_psi")
        .select("id,data,hora,nome,telemovel,email,nif,estado,tipo,lingua,formando,valor,obs,order_id,fatura_estado")
        .in("estado", ["pendente", "pago", "realizado", "faltou"]).gte("data", addDias(hoje, membro ? -14 : 0)).lte("data", addDias(hoje, 21))
        .order("data").order("hora");
      return json(req, { dias, marcacoes: ms ?? [], hoje, eu: membro });
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
        obs: `Marcado por ${quem} (WhatsApp/telefone)`,
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

    if (b.acao === "estado") {
      if (!/^[0-9a-f-]{36}$/.test(String(b.id ?? ""))) return json(req, { erro: "id" }, 400);
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/psi-estado?id=${b.id}`, { signal: AbortSignal.timeout(20000) });
      return json(req, await r.json().catch(() => ({ estado: "pendente" })));
    }

    // realizado / faltou / cancelar — só com login individual
    if (b.acao === "mudar") {
      if (!membro) return json(req, { erro: "Entre com a sua conta para fazer isto." }, 401);
      const novo = String(b.estado ?? "");
      if (!["realizado", "faltou", "cancelado", "pago"].includes(novo)) return json(req, { erro: "estado" }, 400);
      const { data: m } = await sb.from("marcacoes_psi").select("id,data,estado,obs").eq("id", b.id).maybeSingle();
      if (!m) return json(req, { erro: "Marcação não encontrada." }, 404);
      if (!["pago", "realizado", "faltou"].includes(m.estado)) return json(req, { erro: "Só se pode alterar marcações pagas." }, 400);
      const nota = `${new Date().toISOString().slice(0, 16).replace("T", " ")} ${quem}: ${novo}${b.motivo ? " (" + String(b.motivo).slice(0, 200) + ")" : ""}`;
      await sb.from("marcacoes_psi").update({ estado: novo, obs: [m.obs, nota].filter(Boolean).join(" · ").slice(0, 2000) }).eq("id", m.id);
      let google = null;
      if (novo === "cancelado") google = await apagarEventoGoogle(m.id, m.data);
      return json(req, { ok: true, google });
    }

    return json(req, { erro: "ação desconhecida" }, 400);
  } catch (e) { console.error(e); return json(req, { erro: "Erro inesperado. Tente de novo." }, 500); }
});
