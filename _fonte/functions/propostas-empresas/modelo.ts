// Proposta a empresas (frotas): gestão das validades dos motoristas
import { moldura } from "./_email.ts";
const AZUL = "#0670C2", TINTA = "#111111", CINZA = "#555B63", FUNDO = "#F4F6F8", LINHA = "#E3E6EA";
const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function ponto(n: number, t: string, txt: string) {
  return `<tr><td width="40" valign="top" style="padding:0 0 16px"><div style="width:28px;height:28px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:14px;font-weight:bold;line-height:28px;text-align:center">${n}</div></td>
<td valign="top" style="padding:3px 0 16px;font-size:15px;line-height:22px;color:${TINTA}"><b>${t}</b><br><span style="color:${CINZA}">${txt}</span></td></tr>`;
}
export function emailEmpresa(empresa: string, sair: string) {
  const emp = e(empresa);
  const titulo = "Nós tratamos dos prazos dos seus motoristas";
  const assunto = `${emp}: formação dos motoristas sem preocupações com prazos`;
  const corpo = `
<p style="margin:0 0 14px"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#E8F2FB;color:${AZUL};font-size:13px;font-weight:bold">Para empresas com frota</span></p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:33px;font-weight:bold;color:${TINTA}">${titulo}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:25px;color:${TINTA}">Bom dia,</p>
<p style="margin:0 0 22px;font-size:16px;line-height:25px;color:${TINTA}">Sou a Flávia Corrêa, do Instituto 31, em Guimarães, entidade formadora certificada pela DGERT. Um CAM, um ADR ou uma carta fora de prazo pode parar um motorista e um camião. Propomos tirar-lhe essa preocupação:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
${ponto(1, "Controlamos as validades", "Envia-nos a lista de motoristas. Avisamos a empresa e o motorista 120, 60 e 15 dias antes de caducar o CAM, ADR, TCC ou a carta.")}
${ponto(2, "Turmas à medida da sua empresa", "Formação contínua (CAM, ADR, TCC, TVDE, Táxi) ao sábado ou nas suas instalações, com datas e horários ajustados à disponibilidade dos seus motoristas.")}
${ponto(3, "Pode ser paga com o Cheque-Formação ou com o FCT", "Como entidade certificada pela DGERT, aceitamos o Cheque-Formação do IEFP e ajudamos na candidatura. Se a empresa tem saldo no Fundo de Compensação do Trabalho, pode usá-lo para pagar a formação, <b>só até 31 de dezembro de 2026</b>.")}
${ponto(4, "Psicotécnicos sem esperas", "Avaliação psicológica para a renovação da carta, marcada online, com o relatório entregue na hora, em Guimarães.")}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};border-radius:16px;margin:0 0 24px"><tr><td style="padding:20px 22px">
<p style="margin:0 0 6px;font-size:16px;font-weight:bold;color:${TINTA}">O controlo de validades não tem custo.</p>
<p style="margin:0 0 16px;font-size:14px;line-height:21px;color:${CINZA}">Só paga a formação ou o psicotécnico quando forem precisos.</p>
<a href="mailto:geral@instituto31.pt?subject=${encodeURIComponent("Proposta para a " + empresa)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:${AZUL};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none">Quero saber mais</a>
<a href="tel:+351916313131" style="display:inline-block;margin:8px 0 0;padding:12px 20px;border-radius:999px;background:#ffffff;color:${TINTA};border:2px solid ${TINTA};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none">916 31 31 31</a>
</td></tr></table>
<p style="margin:0;font-size:15px;line-height:23px;color:${TINTA}">Se preferir, passo pela empresa para conversarmos 15 minutos.</p>
<p style="margin:18px 0 0;font-size:15px;line-height:23px;color:${TINTA}">Com os melhores cumprimentos,<br><b>Flávia Corrêa</b><br><span style="color:${CINZA}">Instituto 31 · Formação, Saúde e Consultoria</span></p>
<p style="margin:22px 0 0;padding-top:14px;border-top:1px solid ${LINHA};font-size:12px;line-height:18px;color:#8A9099">Contactamos a ${emp} por ser uma empresa do setor dos transportes. <a href="${sair}" style="color:#8A9099">Não pretendo receber mais propostas</a>.</p>`;
  return { assunto, html: moldura(titulo, corpo, "Avisamos antes de caducar o CAM, ADR ou a carta dos seus motoristas.") };
}
