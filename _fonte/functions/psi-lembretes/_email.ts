// Modelos de email (HTML compatível com Gmail/Outlook: tabelas e estilos inline)
const AZUL = "#0670C2", TINTA = "#111111", CINZA = "#555B63", FUNDO = "#F4F6F8", LINHA = "#E3E6EA";
const LOGO = "https://instituto31.pt/assets/logo-email-branco.png";
const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function moldura(titulo: string, corpo: string, preheader = "") {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(titulo)}</title></head>
<body style="margin:0;padding:0;background:${FUNDO};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:20px;overflow:hidden;background:#ffffff">
<tr><td style="background:${TINTA};padding:22px 28px"><img src="${LOGO}" width="130" alt="Instituto 31" style="display:block;border:0;width:130px;height:auto"></td></tr>
<tr><td style="height:4px;background:${AZUL};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:${TINTA}">${corpo}</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif"></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px"><tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${CINZA};text-align:center">
Instituto 31 · Formação, Saúde e Consultoria<br>Rua Dr. João Afonso de Almeida 315, 4800-045 Guimarães<br>
<a href="tel:+351916313131" style="color:${CINZA}">916 31 31 31</a> · <a href="mailto:geral@instituto31.pt" style="color:${CINZA}">geral@instituto31.pt</a> · <a href="https://instituto31.pt" style="color:${CINZA}">instituto31.pt</a>
</td></tr></table>
</td></tr></table></body></html>`;
}

function linha(rot: string, val: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINHA};font-size:14px;color:${CINZA};width:42%">${rot}</td><td style="padding:10px 0;border-bottom:1px solid ${LINHA};font-size:15px;color:${TINTA};font-weight:bold;text-align:right">${val}</td></tr>`;
}
function botao(href: string, txt: string, cheio = true) {
  return `<a href="${href}" style="display:inline-block;padding:14px 22px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;${cheio ? `background:${AZUL};color:#ffffff;border:2px solid ${AZUL}` : `background:#ffffff;color:${TINTA};border:2px solid ${TINTA}`}">${txt}</a>`;
}

const DIAS = { pt: ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"], en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], fr: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] };
const MESES = { pt: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] };

export function dataLonga(iso: string, lingua: string) {
  const l = (lingua === "en" || lingua === "fr" ? lingua : "pt") as "pt" | "en" | "fr";
  const d = new Date(iso + "T12:00:00Z");
  const dia = DIAS[l][d.getUTCDay()], mes = MESES[l][d.getUTCMonth()], n = d.getUTCDate();
  if (l === "en") return `${dia}, ${n} ${mes}`;
  if (l === "fr") return `${dia} ${n} ${mes}`;
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${n} de ${mes}`;
}

// deno-lint-ignore no-explicit-any
export function emailConfirmacao(m: any) {
  const l = m.lingua === "en" || m.lingua === "fr" ? m.lingua : "pt";
  const T = {
    pt: { selo: "✓ Marcação confirmada", tit: "Está marcado!", sub: "A sua avaliação psicológica ficou marcada e paga.", aval: "Avaliação", obt: "Obtenção · cerca de 1h30", ren: "Renovação · cerca de 50 min", lng: "Língua", pago: "Pago (MB WAY)", ref: "Referência", trazer: "O que trazer", itens: ["Cartão de cidadão (ou passaporte)", "Carta de condução, se já tiver", "Óculos ou lentes, se usar"], chegar: "Chegue 10 minutos antes. O relatório é entregue na hora.", mapa: "Ver no mapa", alterar: "Alterar ou cancelar", nota: "Alterações e cancelamentos são grátis até 24 horas antes, por telefone ou WhatsApp.", pre: "Marcado para" },
    en: { selo: "✓ Booking confirmed", tit: "You're booked!", sub: "Your psychological assessment is booked and paid.", aval: "Assessment", obt: "First licence · about 1h30", ren: "Renewal · about 50 min", lng: "Language", pago: "Paid (MB WAY)", ref: "Reference", trazer: "What to bring", itens: ["ID card or passport", "Driving licence, if you have one", "Glasses or contact lenses, if you use them"], chegar: "Please arrive 10 minutes early. You get the report on the spot.", mapa: "Open map", alterar: "Change or cancel", nota: "Free changes and cancellations up to 24 hours before, by phone or WhatsApp.", pre: "Booked for" },
    fr: { selo: "✓ Réservation confirmée", tit: "C'est réservé !", sub: "Votre évaluation psychologique est réservée et payée.", aval: "Évaluation", obt: "Obtention · environ 1h30", ren: "Renouvellement · environ 50 min", lng: "Langue", pago: "Payé (MB WAY)", ref: "Référence", trazer: "À apporter", itens: ["Pièce d'identité ou passeport", "Permis de conduire, si vous l'avez", "Lunettes ou lentilles, si vous en portez"], chegar: "Merci d'arriver 10 minutes en avance. Le rapport est remis sur place.", mapa: "Voir le plan", alterar: "Modifier ou annuler", nota: "Modification ou annulation gratuite jusqu'à 24 heures avant, par téléphone ou WhatsApp.", pre: "Réservé pour" },
  }[l];
  const LNG: Record<string, string> = { pt: "Português", en: "English", fr: "Français" };
  const hora = String(m.hora).slice(0, 5);
  const quando = dataLonga(m.data, l);
  const corpo = `
<p style="margin:0 0 14px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:13px;font-weight:bold">${T.selo}</span></p>
<h1 style="margin:0 0 6px;font-size:30px;line-height:34px;font-weight:bold;color:${TINTA}">${T.tit}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:22px;color:${CINZA}">${T.sub}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};border-radius:16px"><tr><td style="padding:20px 22px">
<p style="margin:0;font-size:15px;color:${CINZA}">${e(quando)}</p>
<p style="margin:4px 0 0;font-size:40px;line-height:44px;font-weight:bold;color:${AZUL}">${hora}</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px">
${linha(T.aval, m.tipo === "renovacao" ? T.ren : T.obt)}
${linha(T.lng, LNG[m.lingua] ?? "Português")}
${linha(m.metodo_pag && m.metodo_pag !== "mbway" ? T.pago.replace(" (MB WAY)", "") : T.pago, `${Number(m.valor).toFixed(2).replace(".", ",")} €`)}
${linha(T.ref, e(m.order_id ?? ""))}
</table>
<h2 style="margin:24px 0 8px;font-size:17px;color:${TINTA}">${T.trazer}</h2>
<ul style="margin:0 0 10px;padding-left:20px;font-size:15px;line-height:24px;color:${TINTA}">${T.itens.map((i) => `<li>${i}</li>`).join("")}</ul>
<p style="margin:0 0 24px;font-size:14px;line-height:21px;color:${CINZA}">${T.chegar}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding:0 8px 10px 0">${botao("https://maps.google.com/?q=Instituto+31+Rua+Dr.+Jo%C3%A3o+Afonso+de+Almeida+315+Guimar%C3%A3es", T.mapa)}</td>
<td style="padding:0 0 10px 0">${botao("https://wa.me/351916313131", T.alterar, false)}</td>
</tr></table>
<p style="margin:10px 0 0;font-size:13px;line-height:19px;color:${CINZA}">${T.nota}</p>`;
  return { assunto: `${l === "pt" ? "Psicotécnico marcado" : l === "en" ? "Booking confirmed" : "Réservation confirmée"} · ${quando} · ${hora}`, html: moldura(T.tit, corpo, `${T.pre} ${quando}, ${hora}`) };
}

// deno-lint-ignore no-explicit-any
export function emailEquipa(m: any) {
  const hora = String(m.hora).slice(0, 5);
  const quando = dataLonga(m.data, "pt");
  const LNG: Record<string, string> = { pt: "Português", en: "English", fr: "Français" };
  const porEquipa = (/Marcado por ([^(·]+?)\s*[(·]/.exec(String(m.obs ?? "")) || [])[1] || "";
  const corpo = `
<p style="margin:0 0 14px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E7F6EC;color:#1E7B3A;font-size:13px;font-weight:bold">● ${porEquipa ? "Pago · marcado por " + e(porEquipa) : "Pago pelo site"}</span></p>
<h1 style="margin:0 0 18px;font-size:24px;line-height:30px;font-weight:bold">${e(m.nome)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px">
${linha("Quando", `${e(quando)} · ${hora}`)}
${linha("Avaliação", m.tipo === "renovacao" ? "Renovação" : "Obtenção")}
${linha("Língua", LNG[m.lingua] ?? "Português")}
${linha("Telemóvel", `<a href="tel:+351${e(m.telemovel)}" style="color:${TINTA}">${e(m.telemovel)}</a>`)}
${linha("Email", m.email ? `<a href="mailto:${e(m.email)}" style="color:${TINTA}">${e(m.email)}</a>` : "—")}
${linha("NIF", m.nif ? e(m.nif) : "— (consumidor final)")}
${linha("Pago (MB WAY)", `${Number(m.valor).toFixed(2).replace(".", ",")} €`)}
${m.formando ? linha("Código de formando", e(m.codigo ?? "")) : ""}
${linha("Referência", e(m.order_id ?? ""))}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#FFF6E0;border-radius:12px"><tr><td style="padding:14px 16px;font-size:14px;line-height:20px;color:#6B4E00"><b>A fazer:</b> rever e finalizar a fatura-recibo em rascunho no TOConline (Vendas → Faturas, série WEB). A marcação já está na agenda "Psicotécnicos".</td></tr></table>`;
  return { assunto: `${porEquipa ? "Marcação confirmada (equipa)" : "Nova marcação paga"} · ${e(m.nome)} · ${quando} ${hora}`, html: moldura("Nova marcação paga", corpo, `${m.nome} · ${quando} ${hora}`) };
}
