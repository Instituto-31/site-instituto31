/* Instituto 31 — preenchimento dos documentos do psicotécnico (relatório, certificado, 2.ª via, consentimento).
   Porta a lógica da app de abril (main.py /api/psi/relatorio) para o browser.
   Os modelos em branco estão em /modelos/. Nada sai do browser: o documento é gerado e descarregado aqui. */
(function (root) {
  'use strict';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var PSICOLOGA = 'Flávia Corrêa', CEDULA = '21032';
  var CONSULT_MORADA = 'Rua Doutor João Afonso de Almeida n.º 315', CONSULT_CP = '4800045', CONSULT_LOC = 'Guimarães';
  var G1 = ['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'BTP'], G2 = ['C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function partes(iso) { if (!iso) return ['', '', '']; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if (!m) return ['', '', '']; return [String(+m[3]), MESES[+m[2] - 1], m[1]]; }
  function dmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[3] + m[2] + m[1] : ''; }
  function rb(t, nTabs) { return '<w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>' + new Array((nTabs || 0) + 1).join('<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>'); }
  function dividir(c) {
    var p = String(c || '').toUpperCase().split(/[,;/\s]+/).filter(Boolean);
    return [p.filter(function (x) { return G1.indexOf(x) >= 0; }).join(', '), p.filter(function (x) { return G2.indexOf(x) >= 0; }).join(', ')];
  }
  function rep(xml, a, b) { return xml.split(a).join(b); }
  function sub1(xml, re, fn) { return xml.replace(re, fn); }

  /* ---------- certificado (e 2.ª via) ---------- */
  function certificado(xml, D) {
    var BOX = '<w:r><w:rPr><w:spacing w:val="80"/><w:w w:val="150"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>';
    var TAB = '<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>';
    function caixas(bloco, valor, max) {
      var i = 0; return bloco.split(BOX).reduce(function (acc, peca, k) { if (k === 0) return peca; var r = (i < valor.length && (max == null || i < max)) ? '<w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + esc(valor[i]) + '</w:t></w:r>' : BOX; if (i < valor.length) i++; return acc + r + peca; }, '');
    }
    var aptoG = D.resultado !== 'inapto';
    var auto = dividir(D.carta_cats);
    var cartaCats = [D.carta_cats_g1 || auto[0], D.carta_cats_g2 || auto[1]].filter(Boolean).join(', ') || D.carta_cats || '';
    var cg1 = aptoG ? (D.cats_g1 || '') : '', cg2 = aptoG ? (D.cats_g2 || '') : '';
    var carta = /\d/.test(D.carta_num || '') ? String(D.carta_num).trim() : '';
    var cc = String(D.doc_num || '').replace(/\s/g, '');
    var cp = String(D.cp || '').replace(/\D/g, ''); if (cp.length !== 7) cp = '';

    xml = rep(xml, '<w:t xml:space="preserve">(Nome) PLACEHOLDER_PSICOLOGO, </w:t>', '<w:t xml:space="preserve">(Nome) </w:t></w:r>' + rb(PSICOLOGA) + '<w:r><w:t xml:space="preserve">, </w:t>');
    xml = rep(xml, '<w:t xml:space="preserve">Certifica que PLACEHOLDER_NOME, </w:t>', '<w:t xml:space="preserve">Certifica que </w:t></w:r>' + rb(D.nome) + '<w:r><w:t xml:space="preserve">, </w:t>');
    xml = rep(xml, '<w:t xml:space="preserve">residente em PLACEHOLDER_MORADA, </w:t>', '<w:t xml:space="preserve">residente em </w:t></w:r>' + rb(D.morada) + '<w:r><w:t xml:space="preserve">, </w:t>');
    xml = rep(xml, '<w:t xml:space="preserve">|, emitido por PLACEHOLDER_CC_EMITIDO </w:t></w:r>' + TAB + TAB + TAB, '<w:t xml:space="preserve">|, emitido por </w:t></w:r>' + rb('República Portuguesa ') + TAB);
    xml = rep(xml, '<w:r><w:t xml:space="preserve">para as categorias PLACEHOLDER_CATS, </w:t></w:r>', '<w:r><w:br/></w:r><w:r><w:t xml:space="preserve">para as categorias PLACEHOLDER_CATS, </w:t></w:r>');
    if (cartaCats) xml = rep(xml, '<w:t xml:space="preserve">para as categorias PLACEHOLDER_CATS, </w:t></w:r>' + TAB + TAB + TAB, '<w:t xml:space="preserve">para as categorias </w:t></w:r>' + rb(cartaCats));
    if (D.obs) xml = rep(xml, '<w:t xml:space="preserve">Observações: PLACEHOLDER_OBS </w:t>', '<w:t xml:space="preserve">Observações: </w:t></w:r>' + rb(D.obs) + '<w:r><w:t xml:space="preserve"> </w:t>');
    // cédula
    xml = rep(xml, '</w:t></w:r>' + TAB + '<w:r><w:rPr><w:spacing w:val="-4"/></w:rPr><w:t>ou,</w:t></w:r>', '</w:t></w:r>' + rb(CEDULA + ' ') + '<w:r><w:rPr><w:spacing w:val="-4"/></w:rPr><w:t>ou,</w:t></w:r>');
    // CC e carta, um carácter por caixa
    function porCaixa(ini, fim, valor) {
      var a = xml.indexOf(ini); if (a < 0 || !valor) return; var b = xml.indexOf(fim, a); if (b < 0) return;
      xml = xml.slice(0, a) + caixas(xml.slice(a, b), valor) + xml.slice(b);
    }
    porCaixa('<w:t>portador do BI/CC n.º |</w:t></w:r>', '<w:t xml:space="preserve">|, emitido por', cc);
    porCaixa('<w:t>da carta/licença de condução n.º |</w:t></w:r>', '<w:t xml:space="preserve">|, emitida por', carta);
    xml = sub1(xml, /(<w:t xml:space="preserve">\|, emitida por <\/w:t><\/w:r>)(?:<w:r><w:rPr><w:u w:val="single"\/><\/w:rPr><w:tab\/><\/w:r>){2,5}/, function (_, a) { return a + rb(D.carta_emitida || 'IMT') + TAB; });
    // validades da carta (Grupo 1 e Grupo 2)
    var SL = '<w:r><w:rPr><w:spacing w:val="80"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">  </w:t></w:r>';
    var DEm = '<w:proofErr w:type="spellStart"/><w:r><w:t>de</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve"> </w:t></w:r>';
    function validade(ant, iso) {
      var p = partes(iso); if (!p[0]) return;
      xml = rep2(ant + SL, ant + rb(p[0] + ' '));
      xml = rep2(ant + rb(p[0] + ' ') + '<w:r><w:t xml:space="preserve">de </w:t></w:r>' + TAB, ant + rb(p[0] + ' ') + '<w:r><w:t xml:space="preserve">de </w:t></w:r>' + rb(p[1] + ' '));
      xml = rep2(rb(p[1] + ' ') + DEm + TAB, rb(p[1] + ' ') + DEm + rb(p[2] + ' '));
    }
    function rep2(a, b) { var i = xml.indexOf(a); return i < 0 ? xml : xml.slice(0, i) + b + xml.slice(i + a.length); }
    validade('<w:t xml:space="preserve">, válidas até </w:t></w:r>', D.carta_vg1);
    xml = rep(xml, '<w:t xml:space="preserve">e até </w:t>', '<w:t xml:space="preserve">e </w:t></w:r><w:r><w:br/></w:r><w:r><w:t xml:space="preserve">até </w:t>');
    validade('<w:t xml:space="preserve">até </w:t></w:r>', D.carta_vg2);
    // apto G1 / G2
    if (cg1) xml = rep2.call(null, '<w:t xml:space="preserve">para conduzir veículos do Grupo 1, das categorias </w:t></w:r>' + TAB, '<w:t xml:space="preserve">para conduzir veículos do Grupo 1, das categorias </w:t></w:r>' + rb(cg1 + ' ', 1));
    if (cg2) xml = rep2('<w:t xml:space="preserve">categorias </w:t></w:r>' + TAB, '<w:t xml:space="preserve">categorias </w:t></w:r>' + rb(cg2 + ' ', 1));
    // consultório: código postal e localidade
    var s = xml.indexOf(' Situado em '), c = s >= 0 ? xml.indexOf('Certifica que', s) : -1;
    if (s >= 0 && c > s) {
      var meio = xml.slice(s, c), k = 0;
      meio = meio.replace(/<w:r><w:rPr>(?:(?!<\/w:rPr>).)*?<w:u w:val="single"\/>(?:(?!<\/w:rPr>).)*?<\/w:rPr>(?:<w:t xml:space="preserve">  <\/w:t>|<w:tab\/>)<\/w:r>/g, function (m0) {
        k++; if (k >= 2 && k <= 8) return '<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + CONSULT_CP[k - 2] + '</w:t></w:r>'; return m0;
      });
      meio = meio.replace(/(<w:t xml:space="preserve">\| <\/w:t><\/w:r>)<w:r><w:rPr><w:sz w:val="20"\/><w:u w:val="single"\/><\/w:rPr><w:tab\/><\/w:r>/, '$1<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + CONSULT_LOC + '</w:t></w:r>');
      xml = xml.slice(0, s) + meio + xml.slice(c);
    }
    if (D.restricoes) xml = rep2('<w:t xml:space="preserve">julho </w:t></w:r>' + TAB, '<w:t xml:space="preserve">julho </w:t></w:r>' + rb(D.restricoes + ' ') + TAB);
    xml = rep2('<w:t xml:space="preserve"> Situado em </w:t></w:r>' + TAB, '<w:t xml:space="preserve"> Situado em </w:t></w:r>' + rb(CONSULT_MORADA + ' ', 1));
    // código postal e localidade do cliente
    if (cp) {
      var mi = xml.indexOf('residente em'), bi = mi >= 0 ? xml.indexOf('portador do BI/CC', mi) : -1;
      if (mi >= 0 && bi > mi) {
        var mid = caixas(xml.slice(mi, bi), cp, 7);
        if (D.loc) mid = mid.replace(/<w:t xml:space="preserve">\| <\/w:t><\/w:r>(?:<w:r><w:rPr>[^<]*?<w:u w:val="single"\/>[^<]*?<\/w:rPr>(?:<w:tab\/>|<w:t xml:space="preserve"> <\/w:t>)<\/w:r>|<w:proofErr w:type="[^"]+"\/>)+/, function () { return '<w:t xml:space="preserve">| </w:t></w:r>' + rb(D.loc); });
        xml = xml.slice(0, mi) + mid + xml.slice(bi);
      }
    }
    // local e data (só existe no original; a 2.ª via não tem esta linha)
    var p = partes(D.data);
    if (p[0]) {
      xml = xml.replace(new RegExp(reEsc(TAB + '<w:r><w:t xml:space="preserve">, </w:t></w:r>' + TAB + '<w:r><w:t xml:space="preserve">de </w:t></w:r>' + TAB) + '(' + reEsc('<w:proofErr w:type="spellStart"/><w:r><w:t>de</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:rPr><w:spacing w:val="-3"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:spacing w:val="-10"/></w:rPr><w:t>2</w:t></w:r>') + ')' + reEsc(TAB)),
        function (_, g) { return rb(CONSULT_LOC, 1) + '<w:r><w:t xml:space="preserve">, </w:t></w:r>' + rb(p[0] + ' ', 1) + '<w:r><w:t xml:space="preserve">de </w:t></w:r>' + rb(p[1] + ' ', 1) + g + rb(p[2].slice(1)); });
    }
    return xml.replace(/PLACEHOLDER_[A-Z0-9_]+/g, '');
  }

  /* ---------- relatório (1.ª parte: identificação) ---------- */
  function relatorio(xml, D) {
    function aposEtiqueta(et, valor) {
      if (!valor) return;
      var a = '<w:t xml:space="preserve">' + et + ' </w:t></w:r>', i = xml.indexOf(a); if (i < 0) { a = '<w:t>' + et + '</w:t></w:r>'; i = xml.indexOf(a); } if (i < 0) return;
      var j = i + a.length;
      xml = xml.slice(0, j) + '<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">' + esc(valor) + ' </w:t></w:r>' + xml.slice(j);
    }
    function caixasPar(prefixo, valores) { // valores: lista, uma por grupo de caixas do parágrafo (ou string única para todas)
      xml = xml.replace(/<w:p[ >](?:(?!<w:p[ >]).)*?<\/w:p>/g, function (par) {
        var txt = (par.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('');
        if (txt.replace(/\s/g, '').indexOf(prefixo) !== 0) return par;
        var stream = typeof valores === 'string' ? valores : null, gi = -1, ci = 0;
        return par.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, function (m0, a, t, b) {
          if (t.indexOf('_') < 0) return m0;
          var v; if (stream != null) v = stream; else { gi++; ci = 0; v = valores[gi] || ''; }
          var out = t.replace(/_/g, function () { var ch = stream != null ? v[ci] : v[ci]; ci++; return ch ? esc(ch) : '_'; });
          if (stream == null && ci < v.length) out += esc(v.slice(ci));
          return a + out + b;
        });
      });
    }
    var idade = '';
    if (D.nasc && D.data) { var n = D.nasc.split('-'), d = D.data.split('-'); idade = String(d[0] - n[0] - ((d[1] + d[2]) < (n[1] + n[2]) ? 1 : 0)); }
    aposEtiqueta('Nome', D.nome);
    aposEtiqueta('Residência', D.morada);
    aposEtiqueta('Nacionalidade', D.nac);
    aposEtiqueta('Naturalidade', D.nat);
    aposEtiqueta('Categorias', D.carta_cats);
    aposEtiqueta('Restrições/adaptações', D.carta_restricoes);
    caixasPar('Dataexame', dmy(D.data));
    caixasPar('Idade', idade);
    caixasPar('CódigoPostal', String(D.cp || '').replace(/\D/g, ''));
    caixasPar('Contactos:', [String(D.tel || '').replace(/\D/g, ''), '', D.email || '']);
    caixasPar('BI/CC./Pass.n.º', String(D.doc_num || '').replace(/\s/g, ''));
    caixasPar('Até', dmy(D.doc_val));
    caixasPar('NIF', String(D.nif || '').replace(/\D/g, ''));
    caixasPar('Títulodecondução', String(D.carta_num || '').replace(/\s/g, ''));
    caixasPar('ValidadeGrupo1', dmy(D.carta_vg1));
    caixasPar('ValidadeGrupo2', dmy(D.carta_vg2));
    // habilitações (o rótulo está partido em vários pedaços)
    if (D.habilitacoes) xml = xml.replace(/(escolar[^<]*<\/w:t><\/w:r>)/, '$1<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve"> ' + esc(D.habilitacoes) + ' </w:t></w:r>');
    // local e data no fim
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(D.data || '');
    if (p) {
      var T = '<w:r><w:rPr><w:sz w:val="20"/><w:u w:val="single"/></w:rPr><w:tab/></w:r>';
      var B = function (t) { return '<w:r><w:rPr><w:b/><w:sz w:val="20"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + t + '</w:t></w:r>'; };
      var a = '<w:t xml:space="preserve">Local e data </w:t></w:r>', i = xml.indexOf(a);
      if (i >= 0) {
        var j = i + a.length, resto = xml.slice(j);
        resto = resto.replace(T, B(CONSULT_LOC + ' ')).replace(T, B(' ' + p[3])).replace(T, B(p[2])).replace(T, B(p[1]));
        xml = xml.slice(0, j) + resto;
      }
    }
    return xml;
  }

  /* ---------- consentimento ---------- */
  function consentimento(xml, D) {
    var nasc = partes(D.nasc); var nascTxt = nasc[0] ? nasc[0] + ' de ' + nasc[1] + ' de ' + nasc[2] : '';
    function r(a, b) { if (b) { var i = xml.indexOf(a); if (i >= 0) xml = xml.slice(0, i) + esc(b) + xml.slice(i + a.length); } }
    r('________________________________________', D.nome);
    r('____________________', nascTxt);
    r('________________________', String(D.doc_num || ''));
    return xml;
  }

  var MODELOS = { relatorio: 'psi_relatorio.docx', certificado: 'psi_certificado.docx', certificado2: 'psi_certificado_2via.docx', consentimento: 'psi_consentimento.docx' };
  var NOMES = { relatorio: 'Relatorio', certificado: 'Certificado', certificado2: 'Certificado_2via', consentimento: 'Consentimento' };

  function preencher(tipo, buf, D, JSZip) {
    return JSZip.loadAsync(buf).then(function (z) {
      return z.file('word/document.xml').async('string').then(function (xml) {
        xml = tipo === 'relatorio' ? relatorio(xml, D) : tipo === 'consentimento' ? consentimento(xml, D) : certificado(xml, D);
        z.file('word/document.xml', xml);
        return z.generateAsync({ type: typeof window === 'undefined' ? 'nodebuffer' : 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      });
    });
  }
  function nomeFicheiro(tipo, D) {
    var n = String(D.nome || 'cliente').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    return 'PSI_' + NOMES[tipo] + '_' + n + '.docx';
  }
  var api = { MODELOS: MODELOS, preencher: preencher, nomeFicheiro: nomeFicheiro, dividir: dividir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PsiDocs = api;
})(this);
