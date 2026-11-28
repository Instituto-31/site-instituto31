// Emissão da fatura-recibo no TOConline para marcações pagas no site.
// Interruptor em config_interna.FATURACAO: "desligada" | "rascunho" | "final".
import { toc } from "./_toc.ts";

// deno-lint-ignore no-explicit-any
type SB = any;

export const TOC = {
  SERIE_FR_WEB: 8670614,   // série WEB, fatura-recibo (comunicada à AT a 27/11/2026)
  SERVICO_PSI: 6275009,    // serviço 43 "Consulta de Psicologia - Avaliação Psicológica (Psicotécnico)"
  IVA_ISENTO: 4,           // taxa ISE 0 % (PT)
  MOTIVO_M07: 9,           // motivo de isenção M07 (art. 9.º CIVA) — a confirmar com a contabilista
};

export function nifValido(n: string): boolean {
  if (!/^[1235689]\d{8}$/.test(n) && !/^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 8; i++) s += Number(n[i]) * (9 - i);
  const r = s % 11;
  const dv = r < 2 ? 0 : 11 - r;
  return dv === Number(n[8]);
}

export async function modoFaturacao(sb: SB): Promise<string> {
  const { data } = await sb.from("config_interna").select("valor").eq("chave", "FATURACAO").maybeSingle();
  return data?.valor ?? "desligada";
}

function descricaoLinha(m: SB): string {
  const tipo = m.tipo === "renovacao" ? "renovação" : "obtenção";
  const [y, mm, d] = String(m.data).split("-");
  return `Consulta de Psicologia - Avaliação Psicológica (Psicotécnico), ${tipo}, ${d}/${mm}/${y} ${String(m.hora).slice(0, 5)}`;
}

const MEIO: Record<string, [string, string]> = {
  mbway: ["TR", "Pago por MB WAY"],
  dinheiro: ["MO", "Pago em numerário ao balcão"],
  cartao: ["DC", "Pago com cartão (TPA) ao balcão"],
  transferencia: ["TR", "Pago por transferência bancária"],
};
function cabecalho(m: SB) {
  const comNif = !!m.nif;
  return {
    document_type: "FR",
    document_series_id: TOC.SERIE_FR_WEB,
    date: new Date().toISOString().slice(0, 10),
    customer_business_name: comNif ? m.nome : "Consumidor final",
    customer_tax_registration_number: comNif ? m.nif : "999999990",
    customer_country: "PT",
    vat_included_prices: true,
    tax_exemption_reason_id: TOC.MOTIVO_M07,
    payment_mechanism: MEIO[m.metodo_pag]?.[0] ?? "TR", // o TOConline não tem código MB WAY: vai como transferência, com nota
    notes: `${MEIO[m.metodo_pag]?.[1] ?? "Pago por MB WAY no site"} (${m.order_id}).`,
    external_reference: String(m.order_id),
  };
}

// Cria a fatura. modo "rascunho" usa a API antiga (fica em preparação); "final" usa a v1 (finaliza logo).
export async function emitirFatura(sb: SB, m: SB, modoForcado?: string): Promise<{ ok: boolean; id?: string; estado?: string; erro?: string }> {
  const modo = modoForcado ?? (await modoFaturacao(sb));
  if (modo !== "rascunho" && modo !== "final") return { ok: false, estado: "desligada" };
  if (m.toc_doc_id) return { ok: true, id: m.toc_doc_id, estado: m.fatura_estado };
  const marcar = (upd: Record<string, unknown>) => sb.from("marcacoes_psi").update(upd).eq("id", m.id);
  try {
    let id: string | undefined;
    if (modo === "final") {
      const corpo = { ...cabecalho(m), lines: [{ item_type: "Service", item_id: TOC.SERVICO_PSI, description: descricaoLinha(m), quantity: 1, unit_price: Number(m.valor), tax_id: TOC.IVA_ISENTO }] };
      const r = await toc(sb, "POST", "v1/commercial_sales_documents", corpo);
      if (r.status >= 300) throw new Error(`v1 ${r.status}: ${r.texto.slice(0, 400)}`);
      id = String(r.json?.data?.id ?? r.json?.id ?? "");
    } else {
      const r1 = await toc(sb, "POST", "commercial_sales_documents", { data: { type: "commercial_sales_documents", attributes: cabecalho(m) } });
      if (r1.status >= 300) throw new Error(`cabeçalho ${r1.status}: ${r1.texto.slice(0, 400)}`);
      id = String(r1.json?.data?.id ?? "");
      if (!id) throw new Error("cabeçalho sem id");
      const r2 = await toc(sb, "POST", "commercial_sales_document_lines", {
        data: { type: "commercial_sales_document_lines", attributes: { document_id: Number(id), item_type: "Service", item_id: TOC.SERVICO_PSI, description: descricaoLinha(m), quantity: 1, unit_price: Number(m.valor), tax_id: TOC.IVA_ISENTO } },
      });
      if (r2.status >= 300) throw new Error(`linha ${r2.status}: ${r2.texto.slice(0, 400)} (rascunho ${id} criado sem linha)`);
    }
    const estado = modo === "final" ? "emitida" : "rascunho";
    await marcar({ toc_doc_id: id, fatura_estado: estado, fatura_erro: null });
    return { ok: true, id, estado };
  } catch (e) {
    const erro = String(e).slice(0, 800);
    await marcar({ fatura_estado: "erro", fatura_erro: erro });
    return { ok: false, estado: "erro", erro };
  }
}

// Apaga um rascunho (só funciona em documentos ainda em preparação).
export async function apagarRascunho(sb: SB, m: SB): Promise<boolean> {
  if (!m.toc_doc_id || m.fatura_estado !== "rascunho") return false;
  const r = await toc(sb, "DELETE", `commercial_sales_documents/${Number(m.toc_doc_id)}`);
  if (r.status < 300 || r.status === 404) { await sb.from("marcacoes_psi").update({ fatura_estado: "anulada", fatura_erro: null }).eq("id", m.id); return true; }
  return false;
}
