/* Instituto 31 — marcação de psicotécnicos com pagamento MB WAY */
(function () {
  var API = 'https://dzccpluaszhcroehktrg.supabase.co/functions/v1';
  var C = { ink: '#111111', accent: '#0670C2', ground: '#F4F6F8', line2: '#C9CED4', input: '#A3AAB2', muted: '#555B63', muted2: '#3C4248', danger: '#B42318' };
  var root = document.getElementById('marcar');
  if (!root) return;
  var lang0 = root.getAttribute('data-lingua') || 'pt';
  var T = {
    pt: { preDia: 'O dia combinado já não tem vagas. Escolha outro dia, por favor.', preHora: 'A hora combinada já foi ocupada. Escolha outra hora livre, por favor.', titulo: 'Marque o psicotécnico', sub: 'Vagas reais da nossa agenda. Fica marcado assim que paga por MB WAY.', lingua: 'Língua da avaliação', tipo: 'Tipo', obt: 'Obtenção · 1h30', ren: 'Renovação · 50 min', formando: 'Sou formando do Instituto 31 (25 € com código de formando)', dia: 'Dia', hora: 'Hora', nome: 'Nome completo', tel: 'Telemóvel com MB WAY', email: 'Email (para o comprovativo)', nif: 'NIF para a fatura (opcional)', nifErr: 'NIF inválido. Confirme os 9 dígitos ou deixe em branco.', nifPh: 'Em branco = consumidor final', mkt: 'Quero receber o lembrete de renovação e novidades por email (opcional).', rgpd: 'Aceito a <a href="Privacidade.html">Política de Privacidade</a>. Cancelamento ou troca grátis até 24 h antes, por telefone ou WhatsApp.', pagar: 'Marcar e pagar {p} com MB WAY', escolha: 'Escolha o dia e a hora', aprovar: 'Aprove no telemóvel', enviado: 'Enviámos um pedido de {p} para a app MB WAY do número {t}. Tem 4 minutos para aceitar.', marcado: 'Está marcado!', pago: 'Pago: {p}. Enviámos a confirmação para o seu email.', levar: 'Traga o cartão de cidadão, a carta de condução e os óculos, se usar.', nova: 'Nova marcação', semvagas: 'Sem vagas', erro: 'Não foi possível concluir. ', expirou: 'O pedido MB WAY expirou ou foi recusado. A vaga foi libertada — pode tentar outra vez.', tentar: 'Tentar outra vez', carregando: 'A carregar a agenda…', faltam: 'Preencha o nome, um telemóvel válido e aceite a Política de Privacidade.', seguro: 'Pagamento seguro ifthenpay · Dúvidas? 916 31 31 31', dias: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'], meses: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'] },
    en: { preDia: 'The agreed day is no longer available. Please pick another day.', preHora: 'The agreed time has been taken. Please pick another free time.', titulo: 'Book your assessment', sub: 'Real slots from our agenda. Your booking is confirmed as soon as you pay with MB WAY.', lingua: 'Assessment language', tipo: 'Type', obt: 'First licence · 1h30', ren: 'Renewal · 50 min', formando: 'I am an Instituto 31 trainee', dia: 'Day', hora: 'Time', nome: 'Full name', tel: 'Mobile number with MB WAY', email: 'Email (for the receipt)', nif: 'Portuguese tax number (NIF) for the invoice (optional)', nifErr: 'Invalid NIF. Check the 9 digits or leave it blank.', nifPh: 'Leave blank if you do not have one', mkt: 'Send me renewal reminders and news by email (optional).', rgpd: 'I accept the <a href="Privacidade.html">Privacy Policy</a>. Free cancellation or rescheduling up to 24 h before.', pagar: 'Book and pay {p} with MB WAY', escolha: 'Choose a day and time', aprovar: 'Approve on your phone', enviado: 'We sent a {p} request to the MB WAY app on {t}. You have 4 minutes to accept.', marcado: 'You are booked!', pago: 'Paid: {p}. Confirmation sent to your email.', levar: 'Bring your ID card or passport, driving licence and glasses, if you use them.', nova: 'New booking', semvagas: 'Full', erro: 'Something went wrong. ', expirou: 'The MB WAY request expired or was declined. The slot was released — you can try again.', tentar: 'Try again', carregando: 'Loading agenda…', faltam: 'Please fill in your name, a valid mobile number and accept the Privacy Policy.', seguro: 'Secure payment by ifthenpay · Questions? WhatsApp +351 916 31 31 31', dias: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], meses: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
    fr: { preDia: "Le jour convenu n'est plus disponible. Choisissez un autre jour, s'il vous plaît.", preHora: "L'heure convenue a été prise. Choisissez une autre heure libre, s'il vous plaît.", titulo: 'Réservez votre évaluation', sub: 'Créneaux réels de notre agenda. Réservation confirmée dès le paiement MB WAY.', lingua: "Langue de l'évaluation", tipo: 'Type', obt: 'Obtention · 1h30', ren: 'Renouvellement · 50 min', formando: "Je suis stagiaire de l'Instituto 31", dia: 'Jour', hora: 'Heure', nome: 'Nom complet', tel: 'Téléphone avec MB WAY', email: 'Email (pour le reçu)', nif: 'NIF portugais pour la facture (facultatif)', nifErr: 'NIF invalide. Vérifiez les 9 chiffres ou laissez vide.', nifPh: 'Laissez vide si vous n’en avez pas', mkt: 'Recevoir les rappels de renouvellement par email (facultatif).', rgpd: "J'accepte la <a href=\"Privacidade.html\">Politique de confidentialité</a>. Annulation gratuite jusqu'à 24 h avant.", pagar: 'Réserver et payer {p} avec MB WAY', escolha: 'Choisissez le jour et l’heure', aprovar: 'Validez sur votre téléphone', enviado: 'Nous avons envoyé une demande de {p} à l’app MB WAY du {t}. Vous avez 4 minutes.', marcado: 'C’est réservé !', pago: 'Payé : {p}. Confirmation envoyée par email.', levar: 'Apportez votre pièce d’identité, votre permis et vos lunettes.', nova: 'Nouvelle réservation', semvagas: 'Complet', erro: 'Une erreur est survenue. ', expirou: 'La demande MB WAY a expiré ou a été refusée. Le créneau est libéré.', tentar: 'Réessayer', carregando: 'Chargement…', faltam: 'Indiquez votre nom, un numéro valide et acceptez la politique de confidentialité.', seguro: 'Paiement sécurisé ifthenpay · Questions ? WhatsApp +351 916 31 31 31', dias: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'], meses: ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'] }
  };
  var S = { ui: lang0, lingua: lang0, tipo: 'obtencao', formando: false, dia: -1, hora: '', agenda: null, step: 0, id: null, timer: null, fim: 0, msg: '' };
  /* Link pré-preenchido (ex.: ?dia=2026-12-03&hora=10:00&tipo=renovacao&lingua=en&formando=1), enviado pela equipa por WhatsApp */
  var Q = {};
  try { var qs = new URLSearchParams(location.search); Q.dia = qs.get('dia') || ''; Q.hora = qs.get('hora') || ''; Q.tipo = qs.get('tipo') || ''; Q.lingua = qs.get('lingua') || ''; Q.formando = qs.get('formando') || ''; } catch (e) {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(Q.dia || '')) Q.dia = '';
  if (/^\d{1,2}(:|h)\d{2}$/.test(Q.hora || '')) { var hp = Q.hora.split(/:|h/); Q.hora = ('0' + hp[0]).slice(-2) + ':' + hp[1]; } else Q.hora = '';
  if (/^renov/i.test(Q.tipo || '')) S.tipo = 'renovacao'; else if (/^obt/i.test(Q.tipo || '')) S.tipo = 'obtencao';
  if (T[Q.lingua]) { S.lingua = Q.lingua; S.ui = Q.lingua; }
  if (S.lingua === 'pt' && /^(1|sim|true)$/i.test(Q.formando || '')) S.formando = true;
  var PRE = !!(Q.dia || Q.hora || Q.tipo || Q.lingua || Q.formando);
  var t = function () { return T[S.ui]; };
  function nifOk(n) { if (!/^\d{9}$/.test(n) || !/^[1235689]|^(45|7[0-9]|9[0189])/.test(n)) return false; var t = 0; for (var i = 0; i < 8; i++) t += +n[i] * (9 - i); var r = t % 11; return (r < 2 ? 0 : 11 - r) === +n[8]; }
  function preco() { return S.lingua !== 'pt' ? 70 : (S.formando ? 25 : 35); }
  function fmt(v) { return v + ' €'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function chip(on, off) {
    var b = 'font:inherit;cursor:pointer;border-radius:12px;min-height:46px;padding:6px 10px;font-weight:700;';
    if (off) return b + 'background:' + C.ground + ';color:' + C.muted + ';border:1px dashed ' + C.line2 + ';text-decoration:line-through;cursor:not-allowed';
    return on ? b + 'background:' + C.ink + ';color:#fff;border:1px solid ' + C.ink : b + 'background:#fff;color:' + C.ink + ';border:1px solid ' + C.line2;
  }
  var inp = 'font:inherit;font-weight:400;padding:11px 12px;border:1px solid ' + C.input + ';border-radius:10px;width:100%;box-sizing:border-box';
  var lab = 'display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:14px';
  var H2 = "margin:0;font-family:'Work Sans',sans-serif;font-weight:800;letter-spacing:-0.03em;line-height:1.05";
  var btn = function (on) { return 'font:inherit;min-height:56px;border:0;border-radius:999px;font-weight:800;font-size:17px;color:#fff;width:100%;cursor:' + (on ? 'pointer' : 'not-allowed') + ';background:' + (on ? C.accent : C.line2); };

  function loadAgenda() {
    fetch(API + '/psi-agenda').then(function (r) { return r.json(); }).then(function (j) {
      S.agenda = j.dias || [];
      if (Q.dia) {
        for (var k = 0; k < S.agenda.length; k++) { if (S.agenda[k].data === Q.dia) { S.dia = k; break; } }
        if (S.dia < 0) S.msg = t().preDia;
        else if (Q.hora) { if (S.agenda[S.dia].livres.indexOf(Q.hora) >= 0) S.hora = Q.hora; else S.msg = t().preHora; }
        Q.dia = ''; Q.hora = '';
      }
      if (S.dia < 0) { for (var i = 0; i < S.agenda.length; i++) { if (S.agenda[i].livres.length) { S.dia = i; break; } } }
      render();
    }).catch(function () { S.agenda = []; S.msg = t().erro; render(); });
  }

  function render() {
    var L = t(), h = '';
    if (S.step === 0) {
      h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><h2 id="marcar-t" style="' + H2 + ';font-size:28px">' + L.titulo + '</h2><span style="font-weight:800;font-size:26px">' + fmt(preco()) + '</span></div>';
      h += '<p style="margin:-8px 0 0;color:' + C.muted + ';font-size:14px">' + L.sub + '</p>';
      h += '<div><p style="margin:0 0 8px;font-weight:700;font-size:15px">' + L.lingua + '</p><div style="display:flex;flex-wrap:wrap;gap:8px">';
      [['pt', 'Português · 35 €'], ['en', 'English · 70 €'], ['fr', 'Français · 70 €']].forEach(function (o) { h += '<button type="button" data-lingua="' + o[0] + '" aria-pressed="' + (S.lingua === o[0]) + '" style="' + chip(S.lingua === o[0]) + ';padding:6px 14px">' + o[1] + '</button>'; });
      h += '</div></div>';
      h += '<div><p style="margin:0 0 8px;font-weight:700;font-size:15px">' + L.tipo + '</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      [['obtencao', L.obt], ['renovacao', L.ren]].forEach(function (o) { h += '<button type="button" data-tipo="' + o[0] + '" aria-pressed="' + (S.tipo === o[0]) + '" style="' + chip(S.tipo === o[0]) + '">' + o[1] + '</button>'; });
      h += '</div></div>';
      if (S.lingua === 'pt') {
        h += '<label style="display:flex;gap:10px;align-items:center;font-size:15px"><input type="checkbox" id="m-formando"' + (S.formando ? ' checked' : '') + ' style="width:20px;height:20px;margin:0">' + L.formando + '</label>';
        if (S.formando) h += '<label style="' + lab + '">Código de formando<input id="m-codigo" type="text" autocomplete="off" autocapitalize="characters" placeholder="I31-XXXX-XXXX" maxlength="13" style="' + inp + ';text-transform:uppercase;letter-spacing:.05em"><span style="font-weight:400;font-size:12px;color:' + C.muted + '">Entregue pela secretaria. Cada código só pode ser usado uma vez.</span></label>';
      }
      h += '<div><p style="margin:0 0 8px;font-weight:700;font-size:15px">' + L.dia + '</p>';
      if (!S.agenda) { h += '<p style="margin:0;color:' + C.muted + '">' + L.carregando + '</p>'; }
      else {
        h += '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">';
        S.agenda.forEach(function (d, i) {
          var dt = new Date(d.data + 'T12:00:00'), off = !d.livres.length;
          h += '<button type="button" data-dia="' + i + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (S.dia === i) + '" style="' + chip(S.dia === i, off) + ';flex:0 0 64px"><span style="display:block;font-size:12px;font-weight:500">' + L.dias[dt.getDay()] + '</span><span style="display:block;font-weight:800;font-size:18px">' + dt.getDate() + '</span><span style="display:block;font-size:11px;font-weight:500">' + L.meses[dt.getMonth()] + '</span></button>';
        });
        h += '</div>';
      }
      h += '</div>';
      if (S.agenda && S.dia >= 0) {
        var d = S.agenda[S.dia];
        h += '<div><p style="margin:0 0 8px;font-weight:700;font-size:15px">' + L.hora + '</p><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">';
        d.horas.forEach(function (hr) { var off = d.livres.indexOf(hr) < 0; h += '<button type="button" data-hora="' + hr + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (S.hora === hr) + '" style="' + chip(S.hora === hr, off) + '">' + hr + '</button>'; });
        h += '</div></div>';
      }
      h += '<label style="' + lab + '">' + L.nome + '<input id="m-nome" type="text" autocomplete="name" style="' + inp + '"></label>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"><label style="' + lab + '">' + L.tel + '<input id="m-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="9xx xxx xxx" style="' + inp + '"></label><label style="' + lab + '">' + L.email + '<input id="m-email" type="email" autocomplete="email" style="' + inp + '"></label></div>';
      h += '<label style="' + lab + '">' + L.nif + '<input id="m-nif" type="text" inputmode="numeric" autocomplete="off" maxlength="9" placeholder="' + L.nifPh + '" style="' + inp + '"></label>';
      h += '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:' + C.muted2 + '"><input id="m-mkt" type="checkbox" style="width:18px;height:18px;margin:0;flex:none">' + L.mkt + '</label>';
      h += '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:' + C.muted2 + '"><input id="m-rgpd" type="checkbox" style="width:18px;height:18px;margin:0;flex:none"><span>' + L.rgpd + '</span></label>';
      if (S.msg) h += '<p role="alert" style="margin:0;color:' + C.danger + ';font-weight:600;font-size:14px">' + esc(S.msg) + '</p>';
      var can = !!S.hora;
      h += '<button type="button" id="m-pagar" style="' + btn(can) + '">' + (can ? L.pagar.replace('{p}', fmt(preco())) : L.escolha) + '</button>';
      h += '<p style="margin:0;text-align:center;font-size:13px;color:' + C.muted + '">' + L.seguro + '</p>';
    } else if (S.step === 1) {
      var rest = Math.max(0, Math.round((S.fim - Date.now()) / 1000));
      h += '<div style="text-align:center;padding:20px 4px;display:flex;flex-direction:column;gap:14px;align-items:center"><p style="margin:0;font-weight:700;color:' + C.muted + '">MB WAY</p><h2 style="' + H2 + ';font-size:28px">' + L.aprovar + '</h2><p style="margin:0;color:' + C.muted2 + '">' + L.enviado.replace('{p}', fmt(S.valor)).replace('{t}', esc(S.tel)) + '</p><p aria-live="polite" style="margin:0;font-weight:800;font-size:40px;padding:6px 24px;border-radius:14px;background:' + C.ground + '">' + Math.floor(rest / 60) + ':' + ('0' + rest % 60).slice(-2) + '</p></div>';
    } else if (S.step === 2) {
      h += '<div style="text-align:center;padding:24px 4px;display:flex;flex-direction:column;gap:12px;align-items:center"><span style="width:68px;height:68px;border-radius:50%;background:' + C.accent + ';display:flex;align-items:center;justify-content:center"><svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"></path></svg></span><h2 style="' + H2 + ';font-size:32px">' + L.marcado + '</h2><p style="margin:0;font-weight:700;font-size:18px">' + esc(S.quando) + '</p><p style="margin:0;color:' + C.muted2 + '">' + L.pago.replace('{p}', fmt(S.valor)) + '</p><p style="margin:0;font-size:14px;color:' + C.muted + '">' + L.levar + '</p><p style="margin:0;font-size:14px;color:' + C.muted + '">Instituto 31 · Rua Dr. João Afonso de Almeida 315, Guimarães</p><button type="button" id="m-nova" style="font:inherit;min-height:48px;padding:0 22px;border:2px solid ' + C.ink + ';border-radius:999px;background:#fff;color:' + C.ink + ';font-weight:700;cursor:pointer">' + L.nova + '</button></div>';
    } else if (S.step === 3) {
      h += '<div style="text-align:center;padding:24px 4px;display:flex;flex-direction:column;gap:14px;align-items:center"><h2 style="' + H2 + ';font-size:26px">MB WAY</h2><p style="margin:0;color:' + C.muted2 + '">' + L.expirou + '</p><button type="button" id="m-nova" style="' + btn(true) + '">' + L.tentar + '</button></div>';
    }
    var keep = {};
    ['m-nome', 'm-tel', 'm-email', 'm-nif', 'm-codigo'].forEach(function (k) { var e = document.getElementById(k); if (e) keep[k] = e.value; });
    ['m-mkt', 'm-rgpd'].forEach(function (k) { var e = document.getElementById(k); if (e) keep[k] = e.checked; });
    root.innerHTML = h;
    Object.keys(keep).forEach(function (k) { var e = document.getElementById(k); if (!e) return; if (typeof keep[k] === 'boolean') e.checked = keep[k]; else e.value = keep[k]; });
  }

  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.lingua) { S.lingua = b.dataset.lingua; if (S.lingua !== 'pt') S.formando = false; render(); }
    else if (b.dataset.tipo) { S.tipo = b.dataset.tipo; render(); }
    else if (b.dataset.dia) { S.dia = +b.dataset.dia; S.hora = ''; render(); }
    else if (b.dataset.hora) { S.hora = b.dataset.hora; S.msg = ''; render(); }
    else if (b.id === 'm-pagar') { pagar(); }
    else if (b.id === 'm-nova') { S.step = 0; S.hora = ''; S.msg = ''; S.agenda = null; render(); loadAgenda(); }
  });
  root.addEventListener('change', function (ev) { if (ev.target.id === 'm-formando') { S.formando = ev.target.checked; render(); } });

  function pagar() {
    if (!S.hora) return;
    var nome = document.getElementById('m-nome').value.trim();
    var tel = document.getElementById('m-tel').value.replace(/\D/g, '');
    if (tel.length === 12 && tel.indexOf('351') === 0) tel = tel.slice(3);
    var email = document.getElementById('m-email').value.trim();
    var nifEl = document.getElementById('m-nif'); var nif = nifEl ? nifEl.value.replace(/\D/g, '') : '';
    if (nif && !nifOk(nif)) { S.msg = L.nifErr; render(); return; }
    var rgpd = document.getElementById('m-rgpd').checked;
    if (nome.length < 3 || !/^9\d{8}$/.test(tel) || !rgpd) { S.msg = t().faltam; render(); return; }
    var codigo = '';
    if (S.formando) { var ce = document.getElementById('m-codigo'); codigo = ce ? ce.value.trim().toUpperCase() : ''; if (!/^I31-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) { S.msg = 'Escreva o seu código de formando (ex.: I31-ABCD-1234) ou desligue a opção de formando.'; render(); return; } }
    var b = document.getElementById('m-pagar'); b.disabled = true; b.textContent = '…';
    var d = S.agenda[S.dia];
    fetch(API + '/psi-marcar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d.data, hora: S.hora, tipo: S.tipo, lingua: S.lingua, formando: S.formando, codigo: codigo, nome: nome, telemovel: tel, email: email, nif: nif, marketing: document.getElementById('m-mkt').checked, rgpd: true }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { S.msg = t().erro + (res.j.erro || ''); S.agenda = null; render(); loadAgenda(); return; }
        S.id = res.j.id; S.valor = res.j.valor; S.tel = tel; S.step = 1; S.fim = Date.now() + 240000;
        var dt = new Date(d.data + 'T12:00:00');
        S.quando = t().dias[dt.getDay()] + ', ' + dt.getDate() + ' ' + t().meses[dt.getMonth()] + ' · ' + S.hora;
        render(); poll();
      }).catch(function () { S.msg = t().erro; render(); });
  }
  function poll() {
    clearTimeout(S.timer);
    if (S.step !== 1) return;
    render();
    fetch(API + '/psi-estado?id=' + encodeURIComponent(S.id)).then(function (r) { return r.json(); }).then(function (j) {
      if (j.estado === 'pago') { S.step = 2; render(); return; }
      if (j.estado === 'expirado' || j.estado === 'recusado') { S.step = 3; render(); return; }
      S.timer = setTimeout(poll, 4000);
    }).catch(function () { S.timer = setTimeout(poll, 6000); });
  }
  render(); loadAgenda();
  if (PRE) setTimeout(function () { try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 300);
})();
