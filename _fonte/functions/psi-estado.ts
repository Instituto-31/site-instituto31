import { cors, db, enviarEmail, esc, json, moldura } from "./_shared.ts";
const STATUS_URL = "https://api.ifthenpay.com/spg/payment/mbway/status";
const L: Record<string, string> = { pt: "Português", en: "English", fr: "Français" };
function dataPt(d: string) { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json(req, { erro: "id" }, 400);
  const sb = db();
  const { data: m } = await sb.from("marcacoes_psi").select("*").eq("id", id).single();
  if (!m) return json(req, { erro: "não encontrado" }, 404);
  if (m.estado !== "pendente" || !m.request_id) return json(req, { estado: m.estado });
  const u = `${STATUS_URL}?mbWayKey=${encodeURIComponent(Deno.env.get("IFTHENPAY_MBWAY_KEY")!)}&requestId=${encodeURIComponent(m.request_id)}`;
  const j = await fetch(u).then((r) => r.json()).catch(() => ({}));
  let novo: string | null = null;
  if (j.Status === "000") novo = "pago";
  else if (j.Status === "020" || j.Status === "122") novo = "recusado";
  else if (j.Status === "101" || Date.now() - new Date(m.created_at).getTime() > 6 * 60000) novo = "expirado";
  if (!novo) return json(req, { estado: "pendente" });
  const upd: Record<string, unknown> = { estado: novo };
  if (novo === "pago") upd.pago_em = new Date().toISOString();
  const { data: rows } = await sb.from("marcacoes_psi").update(upd).eq("id", id).eq("estado", "pendente").select("id");
  if (novo === "pago" && rows && rows.length) {
    const quando = `${dataPt(m.data)} às ${String(m.hora).slice(0, 5)}`;
    const tipo = m.tipo === "renovacao" ? "Renovação (cerca de 50 min)" : "Obtenção (cerca de 1h30)";
    if (m.email) {
      const en = m.lingua !== "pt";
      await enviarEmail(sb, [{ email: m.email, name: m.nome }],
        en ? `Booking confirmed – ${quando}` : `Psicotécnico marcado – ${quando}`,
        moldura(en ? "Your booking is confirmed" : "Está marcado!",
          `<p style="font-size:18px;font-weight:700;margin:0 0 12px">${esc(quando)}</p>
<p>${en ? "Assessment" : "Avaliação psicológica"}: ${esc(tipo)} · ${esc(L[m.lingua])}<br>${en ? "Paid" : "Pago"}: ${m.valor} € (MB WAY)</p>
<p>${en ? "Please bring your ID card or passport, driving licence and glasses, if you use them. Arrive 10 minutes early." : "Traga o cartão de cidadão, a carta de condução e os óculos, se usar. Chegue 10 minutos antes."}</p>
<p>${en ? "Need to change? WhatsApp +351 916 31 31 31 (free up to 24 h before)." : "Precisa de alterar? Ligue ou envie WhatsApp para 916 31 31 31 (grátis até 24 h antes)."}</p>
<p>Rua Dr. João Afonso de Almeida 315, Guimarães · <a href="https://maps.google.com/?q=Instituto+31+Guimarães">Mapa</a></p>`), "psi_confirmacao");
    }
    await enviarEmail(sb, [{ email: "geral@instituto31.pt", name: "Instituto 31" }],
      `Nova marcação paga: psicotécnico ${quando}`,
      moldura("Nova marcação paga pelo site",
        `<p><b>${esc(m.nome)}</b> · ${esc(m.telemovel)} · ${esc(m.email ?? "sem email")}</p>
<p>${esc(quando)} · ${esc(tipo)} · ${esc(L[m.lingua])}${m.formando ? " · <b>diz ser formando (25 €) – confirmar</b>" : ""}</p>
<p>Pago ${m.valor} € por MB WAY (pedido ${esc(m.order_id)}).</p>
<p><b>Falta emitir a fatura no TOConline.</b></p>`), "psi_aviso_equipa");
  }
  return json(req, { estado: novo });
});
