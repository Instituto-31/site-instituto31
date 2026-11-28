// Avisos automáticos de renovação (corre todos os dias pelo pg_cron).
// Carta de condução (Grupo 1 / Grupo 2) e certificados de formação (5 anos).
// Envia aos 120, 60 e 15 dias antes; cada aviso só sai uma vez (tabela lembretes_enviados).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// Chave de serviço: a nova (sb_secret) e, enquanto existir, a antiga como reserva.
const chaveServico = (): string => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; if (k) return k; } catch { /* sem chaves novas */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; };
import { moldura } from "./_email.ts";

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, chaveServico(), { auth: { persistSession: false } });
const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const MARCOS = [15, 60, 120];
const LIMITE_POR_DIA = 60;
const SITE = "https://instituto31.pt/";
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function hojeLisboa() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function somaDias(iso: string, n: number) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function difDias(a: string, b: string) { return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000); }

const CERT: Record<string, { nome: string; pagina: (curso: string) => string; acao: string }> = {
  cam: { nome: "Certificado de Aptidão para Motorista (CAM)", pagina: (c) => /passag|fcd|fiad/i.test(c) ? "Curso-CAM-Passageiros-Continua.html" : "Curso-CAM-Mercadorias-Continua.html", acao: "a formação contínua de 35 horas" },
  tvde: { nome: "certificado de motorista TVDE", pagina: () => "Curso-TVDE-Continua.html", acao: "a formação contínua TVDE" },
  adr: { nome: "certificado ADR (mercadorias perigosas)", pagina: () => "Curso-ADR-Base-Reciclagem.html", acao: "a reciclagem ADR" },
  tcc: { nome: "certificado de transporte coletivo de crianças", pagina: () => "Curso-TCC-Continua.html", acao: "a formação contínua TCC" },
  cmt: { nome: "certificado de motorista de táxi", pagina: () => "Curso-Taxi-Continua.html", acao: "a formação contínua de táxi" },
};

type Item = { pessoa_id: string; nome: string; email: string; token: string; tipo: string; validade: string; aproximado: boolean; curso: string };

const AZUL = "#0670C2", TINTA = "#111111", CINZA = "#555B63", FUNDO = "#F4F6F8", LINHA = "#E3E6EA";
const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function botao(href: string, txt: string, cheio = true) {
  return `<a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;${cheio ? `background:${AZUL};color:#ffffff;border:2px solid ${AZUL}` : `background:#ffffff;color:${TINTA};border:2px solid ${TINTA}`}">${txt}</a>`;
}
function passos(lista: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${lista.map((t, i) => `<tr>
<td width="40" valign="top" style="padding:0 0 14px"><div style="width:28px;height:28px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:14px;font-weight:bold;line-height:28px;text-align:center">${i + 1}</div></td>
<td valign="top" style="padding:4px 0 14px;font-size:15px;line-height:22px;color:${TINTA}">${t}</td></tr>`).join("")}</table>`;
}
function cartao(rotulo: string, grande: string, pequeno: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};border-radius:16px;margin:0 0 26px"><tr><td style="padding:20px 22px">
<p style="margin:0;font-size:13px;letter-spacing:.3px;text-transform:uppercase;color:${CINZA}">${rotulo}</p>
<p style="margin:6px 0 0;font-size:34px;line-height:40px;font-weight:bold;color:${AZUL}">${grande}</p>
<p style="margin:6px 0 0;font-size:14px;color:${CINZA}">${pequeno}</p>
</td></tr></table>`;
}
function email(it: Item, dias: number) {
  const primeiro = e(String(it.nome).split(" ")[0]);
  const sair = `${Deno.env.get("SUPABASE_URL")}/functions/v1/lembretes-sair?t=${it.token}`;
  const [y, m, d] = it.validade.split("-");
  const grande = it.aproximado ? `${MESES[Number(m) - 1].charAt(0).toUpperCase() + MESES[Number(m) - 1].slice(1)} ${y}` : `${Number(d)} ${MES_CURTO[Number(m) - 1]} ${y}`;
  const falta = it.aproximado ? "Data aproximada, calculada a partir do seu curso" : dias <= 1 ? "Caduca amanhã" : `Faltam ${dias} dias`;
  const whats = botao("https://wa.me/351916313131", "Falar no WhatsApp", false);
  let selo: string, titulo: string, assunto: string, intro: string, cart: string, como: string[], acao: string;
  if (it.tipo.startsWith("carta_")) {
    const g = it.tipo === "carta_g2" ? "2" : "1";
    selo = "Aviso de renovação";
    titulo = "A sua carta está quase a caducar";
    assunto = `${primeiro}, a sua carta de condução (Grupo ${g}) caduca ${dias <= 15 ? "dentro de dias" : "em breve"}`;
    intro = `Olá ${primeiro}, este é um aviso amigável do Instituto 31 para não ser apanhado de surpresa.`;
    cart = cartao(`Carta de condução · Grupo ${g}`, grande, falta);
    como = ["<b>Marque o psicotécnico online</b>, se a sua renovação o exigir. Escolhe o dia e a hora e paga por MB WAY.", "<b>Venha ao Instituto 31</b>, em Guimarães. A avaliação demora cerca de 50 minutos.", "<b>Leve o relatório</b>, entregue na hora, para tratar da renovação da carta."];
    acao = botao(SITE + "Psicotecnicos.html?tipo=renovacao", "Marcar psicotécnico");
  } else {
    const c = CERT[it.tipo];
    selo = "Formação contínua";
    titulo = "Está na hora de renovar o seu certificado";
    assunto = `${primeiro}, renove o seu ${c.nome.replace(/^certificado/, "certificado")} a tempo`;
    intro = `Olá ${primeiro}, pelos nossos registos o seu certificado está perto do fim da validade.`;
    cart = cartao(e(c.nome), grande, falta);
    como = [`<b>Escolha uma turma</b> de ${c.acao.replace(/^a /, "")}.`, "<b>Faça a formação antes da data</b> acima, para não ficar impedido de trabalhar.", "<b>O certificado fica válido por mais 5 anos.</b> Tratamos da comunicação ao IMT."];
    acao = botao(SITE + c.pagina(it.curso), "Ver próximas turmas");
  }
  const corpo = `
<p style="margin:0 0 14px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:13px;font-weight:bold">${selo}</span></p>
<h1 style="margin:0 0 8px;font-size:28px;line-height:33px;font-weight:bold;color:${TINTA}">${titulo}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:22px;color:${CINZA}">${intro}</p>
${cart}
<h2 style="margin:0 0 14px;font-size:17px;color:${TINTA}">Como renovar</h2>
${passos(como)}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding:0 8px 10px 0">${acao}</td><td style="padding:0 0 10px 0">${whats}</td></tr></table>
<p style="margin:14px 0 0;font-size:13px;line-height:19px;color:${CINZA}">Se já renovou, ignore esta mensagem. Dúvidas? Responda a este email ou ligue 916 31 31 31.</p>
<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${LINHA};font-size:12px;line-height:18px;color:#8A9099">Recebe este aviso por ser cliente do Instituto 31. <a href="${sair}" style="color:#8A9099">Não quero receber mais avisos</a>.</p>`;
  return { assunto, html: moldura(titulo, corpo, assunto) };
}

Deno.serve(async (req) => {
  const sb = db();
  const simular = new URL(req.url).searchParams.get("simular") === "1";
  const hoje = hojeLisboa(), ate = somaDias(hoje, 120);
  const itens: Item[] = [];
  // cartas
  const { data: ps } = await sb.from("pessoas").select("id,nome,email,token_saida,carta_vg1,carta_vg2,opt_out")
    .not("email", "is", null).or(`and(carta_vg1.gte.${hoje},carta_vg1.lte.${ate}),and(carta_vg2.gte.${hoje},carta_vg2.lte.${ate})`).limit(2000);
  for (const p of ps ?? []) {
    if (p.opt_out || !/@/.test(p.email ?? "")) continue;
    for (const [t, v] of [["carta_g1", p.carta_vg1], ["carta_g2", p.carta_vg2]] as const) {
      if (v && v >= hoje && v <= ate) itens.push({ pessoa_id: p.id, nome: p.nome, email: p.email, token: p.token_saida, tipo: t, validade: v, aproximado: false, curso: "" });
    }
  }
  // certificados
  const { data: cs } = await sb.from("certificados").select("pessoa_id,tipo,curso,valido_ate,aproximado,pessoas(nome,email,token_saida,opt_out)")
    .gte("valido_ate", hoje).lte("valido_ate", ate).limit(2000);
  for (const c of cs ?? []) {
    // deno-lint-ignore no-explicit-any
    const p: any = c.pessoas;
    if (!p || p.opt_out || !/@/.test(p.email ?? "")) continue;
    itens.push({ pessoa_id: c.pessoa_id, nome: p.nome, email: p.email, token: p.token_saida, tipo: c.tipo, validade: c.valido_ate, aproximado: c.aproximado, curso: c.curso ?? "" });
  }
  // marco de cada aviso e o que já saiu
  const { data: ja } = await sb.from("lembretes_enviados").select("pessoa_id,tipo,validade,marco").gte("validade", hoje);
  const feito = new Set((ja ?? []).map((x) => `${x.pessoa_id}|${x.tipo}|${x.validade}|${x.marco}`));
  const pendentes = itens.map((it) => ({ it, dias: difDias(hoje, it.validade) }))
    .map((x) => ({ ...x, marco: MARCOS.find((m) => x.dias <= m)! }))
    .filter((x) => x.marco && !feito.has(`${x.it.pessoa_id}|${x.it.tipo}|${x.it.validade}|${x.marco}`))
    // também não repete um marco maior se já saiu um mais próximo
    .filter((x) => !MARCOS.some((m) => m < x.marco && feito.has(`${x.it.pessoa_id}|${x.it.tipo}|${x.it.validade}|${m}`)))
    .sort((a, b) => a.dias - b.dias);
  if (simular) {
    const resumo: Record<string, number> = {};
    for (const x of pendentes) resumo[`${x.it.tipo}·${x.marco}`] = (resumo[`${x.it.tipo}·${x.marco}`] ?? 0) + 1;
    return new Response(JSON.stringify({ hoje, candidatos: itens.length, a_enviar: pendentes.length, resumo }), { headers: { "Content-Type": "application/json" } });
  }
  let enviados = 0, erros = 0;
  for (const x of pendentes.slice(0, LIMITE_POR_DIA)) {
    const m = email(x.it, x.dias);
    let ok = false, messageId: string | null = null;
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: [{ email: x.it.email, name: x.it.nome }], subject: m.assunto, htmlContent: m.html }),
      });
      const j = await r.json().catch(() => ({}));
      ok = r.ok; messageId = j.messageId ?? null;
    } catch (_) { /* registado */ }
    await sb.from("emails_log").insert({ tipo: "renovacao_" + x.it.tipo, para: [x.it.email], assunto: m.assunto, estado: ok ? "enviado" : "erro", message_id: messageId });
    if (ok) {
      await sb.from("lembretes_enviados").insert({ pessoa_id: x.it.pessoa_id, tipo: x.it.tipo, validade: x.it.validade, marco: x.marco, email: x.it.email, estado: "enviado" });
      enviados++;
    } else erros++;
  }
  return new Response(JSON.stringify({ hoje, candidatos: itens.length, pendentes: pendentes.length, enviados, erros, ficam_para_amanha: Math.max(0, pendentes.length - LIMITE_POR_DIA) }), { headers: { "Content-Type": "application/json" } });
});
