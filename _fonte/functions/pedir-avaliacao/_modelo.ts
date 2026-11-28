// Email "Obrigado pela visita" com pedido de avaliação no Google (versão final: mistura das versões A e B)
import { moldura } from "./_email.ts";
export const AVALIAR = "https://search.google.com/local/writereview?placeid=ChIJ29d57LDvJA0RdJjMlZT47ks";
const AZUL = "#0670C2", TINTA = "#111111", CINZA = "#555B63", FUNDO = "#F4F6F8", LINHA = "#E3E6EA", OURO = "#F5B301";
const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function emailAvaliacao(nome: string, sair: string | null, formacao: string | null = null) {
  const primeiro = e(String(nome || "").trim().split(/\s+/)[0] || "");
  const titulo = formacao ? (primeiro ? `Parabéns, ${primeiro}!` : "Parabéns!") : (primeiro ? `Obrigado, ${primeiro}!` : "Obrigado pela visita!");
  const abertura = formacao ? `Concluiu a formação ${e(formacao)}. Foi um gosto acompanhar o seu percurso no Instituto 31.` : "Foi um gosto receber a sua visita no Instituto 31.";
  const quem = formacao ? "a opinião de quem faz formação connosco" : "a opinião de quem passa por cá";
  const assunto = `${primeiro ? primeiro + ", " : ""}pode ajudar-nos com 1 minuto?`;
  const estrelas = [1, 2, 3, 4, 5].map(() => `<a href="${AVALIAR}" style="text-decoration:none;color:${OURO};font-size:36px;line-height:42px;padding:0 3px">&#9733;</a>`).join("");
  const corpo = `
<p style="margin:0 0 14px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:13px;font-weight:bold">A sua opinião conta</span></p>
<h1 style="margin:0 0 12px;font-size:30px;line-height:36px;font-weight:bold;color:${TINTA}">${titulo}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:25px;color:${TINTA}">${abertura}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:25px;color:${CINZA}">Somos uma equipa pequena, em Guimarães, e ${quem} faz toda a diferença. Uma avaliação no Google ajuda outras pessoas a encontrar-nos.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};border-radius:16px;margin:0 0 24px"><tr><td align="center" style="padding:24px 18px">
<p style="margin:0 0 4px;font-size:13px;letter-spacing:.3px;text-transform:uppercase;color:${CINZA}">Avalie-nos no Google</p>
<div>${estrelas}</div>
<p style="margin:6px 0 18px;font-size:14px;color:${CINZA}">Leva menos de um minuto · já somos <b style="color:${TINTA}">4,7 &#9733;</b></p>
<a href="${AVALIAR}" style="display:inline-block;padding:15px 26px;border-radius:999px;background:${AZUL};color:#ffffff;border:2px solid ${AZUL};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none">Escrever a minha avaliação &rarr;</a>
</td></tr></table>
<p style="margin:0;font-size:15px;line-height:23px;color:${CINZA}">Se alguma coisa podia ter corrido melhor, também queremos saber: pode responder a este email.</p>
<p style="margin:18px 0 0;font-size:15px;line-height:23px;color:${TINTA}">Obrigada,<br><b>Flávia Corrêa</b><br><span style="color:${CINZA}">Instituto 31</span></p>
${sair ? `<p style="margin:22px 0 0;padding-top:14px;border-top:1px solid ${LINHA};font-size:12px;line-height:18px;color:#8A9099">Recebe este email por ter estado connosco. <a href="${sair}" style="color:#8A9099">Não quero receber mais emails</a>.</p>` : ""}`;
  return { assunto, html: moldura(titulo, corpo, "Uma avaliação no Google ajuda outras pessoas a encontrar-nos.") };
}
