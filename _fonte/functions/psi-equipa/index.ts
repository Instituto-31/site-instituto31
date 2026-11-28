// Página da equipa: ver a agenda e marcar psicotécnicos em nome do cliente,
// enviando o pedido MB WAY diretamente para o telemóvel dele.
// Protegido pelo login da Gestão (Supabase Auth + tabela equipa).
import { addDias, agenda, agoraLisboa, db, preco, slotUtc, SLOT_MIN } from "./_agenda.ts";
import { criarEventoGoogle } from "./_gcal.ts";
import { emailConfirmacao } from "./_email.ts";
import { apagarRascunho, emitirFatura } from "./_fatura.ts";
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

const LNG: Record<string, string> = { pt: "Português", en: "English", fr: "Français" };
const LOCAL = "Instituto 31, Rua Dr. João Afonso de Almeida 315, Guimarães";
const MEIO_TXT: Record<string, string> = { mbway: "MB WAY", dinheiro: "numerário ao balcão", cartao: "cartão ao balcão", transferencia: "transferência" };
// deno-lint-ignore no-explicit-any
async function eventoGoogle(m: any) {
  const ini = slotUtc(m.data, String(m.hora).slice(0, 5));
  const descricao = `${m.nome}\nTel: ${m.telemovel}\nEmail: ${m.email ?? "-"}\n${m.tipo === "renovacao" ? "Renovação" : "Obtenção"} · ${LNG[m.lingua]}${m.formando ? " · formando" : ""}\nPago ${m.valor} € (${MEIO_TXT[m.metodo_pag] ?? m.metodo_pag}) · ${m.order_id}`;
  return await criarEventoGoogle({ id: m.id, titulo: `Psicotécnico – ${m.nome}`, descricao, inicio: ini, fim: ini + SLOT_MIN * 60000, local: LOCAL });
}
// deno-lint-ignore no-explicit-any
async function enviarEmail(sb: any, para: string, nome: string, assunto: string, html: string, tipo: string) {
  let estado = "erro", messageId: string | null = null;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: [{ email: para, name: nome }], subject: assunto, htmlContent: html }),
    });
    const j = await r.json().catch(() => ({}));
    estado = r.ok ? "enviado" : "erro"; messageId = j.messageId ?? null;
  } catch (_) { /* registado */ }
  await sb.from("emails_log").insert({ tipo, para: [para], assunto, estado, message_id: messageId });
}
function ibanValido(iban: string) {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let resto = 0;
  for (const ch of r) resto = (resto * 10 + Number(ch)) % 97;
  return resto === 1;
}
function horasAte(data: string, hora: string) { return (slotUtc(data, String(hora).slice(0, 5)) - Date.now()) / 3600000; }
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
    const b = await req.json().catch(() => ({}));
    // Só entra quem tem sessão na Gestão (a palavra-passe partilhada antiga foi desligada a 28/11/2026)
    const membro = await membroEquipa(sb, req);
    if (!membro) {
      await new Promise((r) => setTimeout(r, 1200));
      return json(req, { erro: "Palavra-passe errada." }, 401);
    }
    const quem = membro?.nome ?? "equipa";

    if (b.acao === "entrar") return json(req, { ok: true });

    if (b.acao === "agenda") {
      const dias = await agenda(sb);
      const hoje = agoraLisboa().data;
      const { data: ms } = await sb.from("marcacoes_psi")
        .select("id,data,hora,nome,telemovel,email,nif,estado,tipo,lingua,formando,valor,obs,order_id,fatura_estado,metodo_pag,remarcacoes,justificacao,justificacao_ficheiro,devolucao_estado")
        .in("estado", ["pendente", "pago", "realizado", "faltou"]).gte("data", addDias(hoje, membro ? -14 : 0)).lte("data", addDias(hoje, 21))
        .order("data").order("hora");
      return json(req, { dias, marcacoes: ms ?? [], hoje, eu: membro });
    }

    if (b.acao === "marcar") {
      const local = ["dinheiro", "cartao", "transferencia"].includes(b.metodo) ? String(b.metodo) : "";
      if (local && !membro) return json(req, { erro: "Entre com a sua conta para registar pagamentos no local." }, 401);
      const nome = String(b.nome ?? "").trim().slice(0, 120);
      const tel = String(b.telemovel ?? "").replace(/\D/g, "").replace(/^351(?=9\d{8}$)/, "");
      const email = String(b.email ?? "").trim().slice(0, 100);
      const lingua = ["pt", "en", "fr"].includes(b.lingua) ? b.lingua : "pt";
      const tipo = b.tipo === "renovacao" ? "renovacao" : "obtencao";
      const formando = lingua === "pt" && !!b.formando;
      const codigo = String(b.codigo ?? "").trim().toUpperCase().slice(0, 20);
      if (nome.length < 3) return json(req, { erro: "Escreva o nome completo do cliente." }, 400);
      if (local ? !/^\d{9}$/.test(tel) : !/^9\d{8}$/.test(tel)) return json(req, { erro: local ? "O telefone tem de ter 9 dígitos." : "O telemóvel tem de ter 9 dígitos e começar por 9 (o número com MB WAY)." }, 400);
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
        obs: local ? `Marcado por ${quem} · pago no local (${MEIO_TXT[local]})` : `Marcado por ${quem} (WhatsApp/telefone)`,
        ...(local ? { estado: "pago", metodo_pag: local, pago_em: new Date().toISOString() } : { metodo_pag: "mbway" }),
      }).select("*").single();
      if (error) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
      if (formando && codigo) {
        const { data: ok } = await sb.rpc("reservar_codigo_formando", { p_codigo: codigo, p_marcacao: m.id });
        if (!ok) {
          await sb.from("marcacoes_psi").update({ estado: "cancelado", obs: "código de formando inválido ou já usado" }).eq("id", m.id);
          return json(req, { erro: "Esse código de formando não é válido ou já foi usado." }, 400);
        }
      }
      if (local) {
        const ev = await eventoGoogle(m);
        if (m.email) { const c = emailConfirmacao(m); await enviarEmail(sb, m.email, m.nome, c.assunto, c.html, "psi_confirmacao"); }
        let fat = null;
        try { fat = await emitirFatura(sb, m); } catch (_) { /* registado */ }
        return json(req, { id: m.id, valor, estado: "pago", google: ev, fatura: fat?.estado ?? null });
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

    // cancelar com regra das 24 h: ≥24 h devolve tudo (por transferência, com IBAN) · <24 h não devolve
    if (b.acao === "cancelar") {
      if (!membro) return json(req, { erro: "Entre com a sua conta para fazer isto." }, 401);
      const { data: m } = await sb.from("marcacoes_psi").select("*").eq("id", b.id).maybeSingle();
      if (!m || m.estado !== "pago") return json(req, { erro: "Só se podem cancelar marcações pagas e por realizar." }, 400);
      const devolve = horasAte(m.data, m.hora) >= 24 && b.devolver !== false;
      const balcao = ["dinheiro", "cartao"].includes(m.metodo_pag);
      const iban = String(b.iban ?? "").replace(/\s+/g, "").toUpperCase();
      if (devolve && !balcao && !ibanValido(iban)) return json(req, { erro: "IBAN inválido. Confirme com o cliente (ex.: PT50 0000 0000 0000 0000 0000 0)." }, 400);
      const nota = `${new Date().toISOString().slice(0, 16).replace("T", " ")} ${quem}: cancelado${devolve ? ` · devolução ${m.valor} € ${balcao ? "ao balcão" : "por transferência"}` : " · sem devolução (menos de 24 h)"}${b.motivo ? " (" + String(b.motivo).slice(0, 200) + ")" : ""}`;
      await sb.from("marcacoes_psi").update({
        estado: "cancelado", obs: [m.obs, nota].filter(Boolean).join(" · ").slice(0, 2000),
        ...(devolve ? { devolucao_estado: "pendente", devolucao_valor: m.valor, devolucao_iban: balcao ? null : iban } : {}),
      }).eq("id", m.id);
      if (devolve && m.codigo) await sb.from("codigos_formando").update({ estado: "livre", marcacao_id: null, usado_em: null }).eq("codigo", m.codigo);
      const google = await apagarEventoGoogle(m.id, m.data);
      let fatura = null;
      try { fatura = (await apagarRascunho(sb, m)) ? "anulada" : m.fatura_estado; } catch (_) { fatura = m.fatura_estado; }
      return json(req, { ok: true, devolucao: devolve, balcao, google, fatura });
    }

    if (b.acao === "devolucao_feita") {
      if (!membro) return json(req, { erro: "Entre com a sua conta para fazer isto." }, 401);
      const { data: m } = await sb.from("marcacoes_psi").select("id,obs,devolucao_estado").eq("id", b.id).maybeSingle();
      if (!m || m.devolucao_estado !== "pendente") return json(req, { erro: "Não há devolução pendente." }, 400);
      const nota = `${new Date().toISOString().slice(0, 16).replace("T", " ")} ${quem}: devolução feita`;
      await sb.from("marcacoes_psi").update({ devolucao_estado: "feita", devolucao_em: new Date().toISOString(), devolucao_iban: null, obs: [m.obs, nota].filter(Boolean).join(" · ").slice(0, 2000) }).eq("id", m.id);
      return json(req, { ok: true });
    }

    if (b.acao === "devolucoes") {
      if (!membro) return json(req, { erro: "Entre com a sua conta." }, 401);
      const { data } = await sb.from("marcacoes_psi").select("id,data,hora,nome,telemovel,valor,metodo_pag,devolucao_valor,devolucao_iban,obs").eq("devolucao_estado", "pendente").order("data");
      return json(req, { lista: data ?? [] });
    }

    // remarcar: ≥24 h livre · <24 h ou falta: 1 vez, com justificação
    if (b.acao === "remarcar") {
      if (!membro) return json(req, { erro: "Entre com a sua conta para fazer isto." }, 401);
      const { data: m } = await sb.from("marcacoes_psi").select("*").eq("id", b.id).maybeSingle();
      if (!m || !["pago", "faltou"].includes(m.estado)) return json(req, { erro: "Só se podem remarcar marcações pagas (ou faltas)." }, 400);
      const foraPrazo = m.estado === "faltou" || horasAte(m.data, m.hora) < 24;
      const just = String(b.justificacao ?? "").trim().slice(0, 1000);
      if (foraPrazo) {
        if ((m.remarcacoes ?? 0) >= 1) return json(req, { erro: "Esta marcação já foi remarcada uma vez fora do prazo. Não pode voltar a ser remarcada sem novo pagamento." }, 400);
        if (just.length < 5) return json(req, { erro: "Fora do prazo de 24 h só se remarca com justificação. Escreva o motivo." }, 400);
      }
      const dias = await agenda(sb);
      const dia = dias.find((d) => d.data === b.data);
      if (!dia || !dia.livres.includes(b.hora)) return json(req, { erro: "Essa hora não está livre. Escolha outra." }, 409);
      const nota = `${new Date().toISOString().slice(0, 16).replace("T", " ")} ${quem}: remarcado de ${m.data} ${String(m.hora).slice(0, 5)} para ${b.data} ${b.hora}${foraPrazo ? " (fora do prazo: " + just + ")" : ""}`;
      const { error } = await sb.from("marcacoes_psi").update({
        data: b.data, hora: b.hora, estado: "pago", obs: [m.obs, nota].filter(Boolean).join(" · ").slice(0, 2000),
        ...(foraPrazo ? { remarcacoes: (m.remarcacoes ?? 0) + 1, justificacao: just, justificacao_ficheiro: b.ficheiro ? String(b.ficheiro).slice(0, 300) : m.justificacao_ficheiro } : {}),
      }).eq("id", m.id);
      if (error) return json(req, { erro: "Essa hora acabou de ficar ocupada. Escolha outra." }, 409);
      await apagarEventoGoogle(m.id, m.data);
      const google = await eventoGoogle({ ...m, data: b.data, hora: b.hora });
      // o rascunho da fatura tem a data na descrição: refaz-se com a data nova
      if (m.fatura_estado === "rascunho" && m.toc_doc_id) {
        try { if (await apagarRascunho(sb, m)) await emitirFatura(sb, { ...m, data: b.data, hora: b.hora, toc_doc_id: null, fatura_estado: null }); } catch (_) { /* fica registado em fatura_erro */ }
      }
      if (m.email && b.avisar !== false) {
        const c = emailConfirmacao({ ...m, data: b.data, hora: b.hora });
        await enviarEmail(sb, m.email, m.nome, c.assunto.replace(/^Psicotécnico marcado/, "Psicotécnico remarcado"), c.html, "psi_remarcacao");
      }
      return json(req, { ok: true, google, foraPrazo });
    }

    // realizado / faltou — só com login individual
    if (b.acao === "mudar") {
      if (!membro) return json(req, { erro: "Entre com a sua conta para fazer isto." }, 401);
      const novo = String(b.estado ?? "");
      if (!["realizado", "faltou", "pago"].includes(novo)) return json(req, { erro: "estado" }, 400);
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
