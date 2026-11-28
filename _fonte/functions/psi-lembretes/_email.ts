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
