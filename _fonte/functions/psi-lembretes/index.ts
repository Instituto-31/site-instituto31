// Lembrete por email na véspera do psicotécnico (corre todos os dias às 18h, pelo pg_cron).
// Só envia uma vez por marcação (coluna lembrete_em).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { dataLonga, moldura } from "./_email.ts";

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function amanhaLisboa() {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const d = new Date(hoje + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const TXT = {
  pt: { ass: "Lembrete: psicotécnico amanhã às", tit: "Até amanhã!", sub: "Lembramos que a sua avaliação psicológica é amanhã.", trazer: "Não se esqueça de trazer", itens: ["Cartão de cidadão (ou passaporte)", "Carta de condução, se já tiver", "Óculos ou lentes, se usar"], chegar: "Chegue 10 minutos antes. O relatório é entregue na hora.", mapa: "Ver no mapa", contacto: "Precisa de alterar?", nota: "Faltando menos de 24 horas, já não é possível cancelar com devolução. Se tiver um imprevisto, fale connosco por telefone ou WhatsApp (916 31 31 31)." },
  en: { ass: "Reminder: your assessment is tomorrow at", tit: "See you tomorrow!", sub: "This is a reminder that your psychological assessment is tomorrow.", trazer: "Please bring", itens: ["ID card or passport", "Driving licence, if you have one", "Glasses or contact lenses, if you use them"], chegar: "Please arrive 10 minutes early. You get the report on the spot.", mapa: "Open map", contacto: "Need to change?", nota: "With less than 24 hours to go, cancellations are no longer refundable. If something comes up, call or WhatsApp us (+351 916 31 31 31)." },
  fr: { ass: "Rappel : votre évaluation est demain à", tit: "À demain !", sub: "Nous vous rappelons que votre évaluation psychologique a lieu demain.", trazer: "N'oubliez pas d'apporter", itens: ["Pièce d'identité ou passeport", "Permis de conduire, si vous l'avez", "Lunettes ou lentilles, si vous en portez"], chegar: "Merci d'arriver 10 minutes en avance. Le rapport est remis sur place.", mapa: "Voir le plan", contacto: "Besoin de modifier ?", nota: "À moins de 24 heures, l'annulation n'est plus remboursable. En cas d'imprévu, appelez-nous ou écrivez-nous sur WhatsApp (+351 916 31 31 31)." },
};

Deno.serve(async () => {
  const sb = db();
  const dia = amanhaLisboa();
  const { data: lista } = await sb.from("marcacoes_psi").select("id,nome,email,data,hora,lingua").eq("data", dia).eq("estado", "pago").is("lembrete_em", null).not("email", "is", null);
  let enviados = 0;
  for (const m of lista ?? []) {
    const l = (m.lingua === "en" || m.lingua === "fr" ? m.lingua : "pt") as "pt" | "en" | "fr";
    const T = TXT[l], hora = String(m.hora).slice(0, 5), quando = dataLonga(m.data, l);
    const corpo = `
<h1 style="margin:0 0 6px;font-size:28px;line-height:32px;font-weight:bold;color:#111111">${T.tit}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:22px;color:#555B63">${T.sub}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;border-radius:16px"><tr><td style="padding:20px 22px">
<p style="margin:0;font-size:15px;color:#555B63">${e(quando)}</p>
<p style="margin:4px 0 0;font-size:40px;line-height:44px;font-weight:bold;color:#0670C2">${hora}</p>
<p style="margin:8px 0 0;font-size:14px;color:#555B63">Rua Dr. João Afonso de Almeida 315, Guimarães</p>
</td></tr></table>
<h2 style="margin:22px 0 8px;font-size:17px;color:#111111">${T.trazer}</h2>
<ul style="margin:0 0 10px;padding-left:20px;font-size:15px;line-height:24px;color:#111111">${T.itens.map((i) => `<li>${i}</li>`).join("")}</ul>
<p style="margin:0 0 20px;font-size:14px;line-height:21px;color:#555B63">${T.chegar}</p>
<p style="margin:0 0 20px"><a href="https://maps.google.com/?q=Instituto+31+Rua+Dr.+Jo%C3%A3o+Afonso+de+Almeida+315+Guimar%C3%A3es" style="display:inline-block;padding:13px 20px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;background:#0670C2;color:#ffffff">${T.mapa}</a></p>
<p style="margin:0;font-size:13px;line-height:19px;color:#555B63"><b>${T.contacto}</b> ${T.nota}</p>`;
    let ok = false, messageId: string | null = null;
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": Deno.env.get("BREVO_API_KEY")!, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: { name: "Instituto 31", email: "geral@instituto31.pt" }, replyTo: { email: "geral@instituto31.pt", name: "Instituto 31" }, to: [{ email: m.email, name: m.nome }], subject: `${T.ass} ${hora}`, htmlContent: moldura(T.tit, corpo, `${T.ass} ${hora}`) }),
      });
      const j = await r.json().catch(() => ({}));
      ok = r.ok; messageId = j.messageId ?? null;
    } catch (_) { /* registado */ }
    await sb.from("emails_log").insert({ tipo: "psi_lembrete", para: [m.email], assunto: `${T.ass} ${hora}`, estado: ok ? "enviado" : "erro", message_id: messageId });
    if (ok) { await sb.from("marcacoes_psi").update({ lembrete_em: new Date().toISOString() }).eq("id", m.id); enviados++; }
  }
  return new Response(JSON.stringify({ dia, candidatos: (lista ?? []).length, enviados }), { headers: { "Content-Type": "application/json" } });
});
