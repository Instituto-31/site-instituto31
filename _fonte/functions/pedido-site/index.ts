import { cors, db, enviarEmail, esc, json, moldura } from "./_shared.ts";
const TIPOS = ["pre_inscricao", "aviso_abertura", "contacto", "empresa"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { erro: "método" }, 405);
  const sb = db();
  try {
    const b = await req.json();
    if (b.website) return json(req, { ok: true });
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : "contacto";
    const nome = String(b.nome ?? "").trim().slice(0, 120);
    const email = String(b.email ?? "").trim().slice(0, 120);
    const tel = String(b.telemovel ?? "").replace(/[^\d+ ]/g, "").slice(0, 20);
    if (b.rgpd !== true || (!email && !tel) || (tipo !== "aviso_abertura" && nome.length < 2)) return json(req, { erro: "Dados em falta." }, 400);
    const curso = String(b.curso ?? "").slice(0, 120);
    const dados = typeof b.dados === "object" && b.dados ? b.dados : {};
    await sb.from("pedidos_site").insert({ tipo, curso, turma: String(b.turma ?? "").slice(0, 120) || null, nome: nome || null, email: email || null, telemovel: tel || null, dados, consent_marketing: !!b.marketing, consent_rgpd_em: new Date().toISOString() });
    const rot: Record<string, string> = { pre_inscricao: "Pré-inscrição", aviso_abertura: "Pedido de aviso de abertura", contacto: "Contacto", empresa: "Pedido de empresa" };
    await enviarEmail(sb, [{ email: "geral@instituto31.pt", name: "Instituto 31" }], `${rot[tipo]} pelo site${curso ? ": " + curso : ""}`,
      moldura(`${rot[tipo]} pelo site`, `<p><b>${esc(nome || "—")}</b> · ${esc(tel || "—")} · ${esc(email || "—")}</p><p>Curso: ${esc(curso || "—")}</p>${Object.keys(dados).length ? `<pre style="white-space:pre-wrap;font-size:13px">${esc(JSON.stringify(dados, null, 2))}</pre>` : ""}<p>Marketing: ${b.marketing ? "sim" : "não"}</p>`), "site_" + tipo);
    if (email && tipo === "pre_inscricao") {
      await enviarEmail(sb, [{ email, name: nome }], `Recebemos a sua pré-inscrição${curso ? " – " + curso : ""}`,
        moldura("Recebemos a sua pré-inscrição", `<p>Olá ${esc(nome)},</p><p>Obrigado pelo interesse${curso ? " no curso <b>" + esc(curso) + "</b>" : ""}. Vamos ligar-lhe nos próximos dias úteis com as datas da próxima turma.</p><p>A inscrição fica válida com o pagamento de 80 €, descontados no preço do curso.</p><p>Dúvidas: 916 31 31 31 (chamada para a rede móvel nacional) ou WhatsApp.</p>`), "site_pre_inscricao_cliente");
    }
    return json(req, { ok: true });
  } catch (e) { console.error(e); return json(req, { erro: "Erro inesperado." }, 500); }
});
