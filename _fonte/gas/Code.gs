// Instituto 31 – ponte entre o site (marcações de psicotécnicos) e a agenda coordenacao@
// Só responde a pedidos com a chave certa (guardada nas Propriedades do script).
function cal_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('CAL_ID');
  var c = id ? CalendarApp.getCalendarById(id) : null;
  if (!c) { var l = CalendarApp.getCalendarsByName('Psicotécnicos'); c = l.length ? l[0] : CalendarApp.createCalendar('Psicotécnicos', { color: CalendarApp.Color.BLUE }); p.setProperty('CAL_ID', c.getId()); }
  return c;
}
function ok_(e) { return e && e.parameter && e.parameter.token === PropertiesService.getScriptProperties().getProperty('TOKEN'); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// GET ?token=…&from=ms&to=ms  →  [{s, e}] (só horas ocupadas, sem detalhes)
function doGet(e) {
  if (!ok_(e)) return out_({ erro: 'acesso' });
  var from = new Date(Number(e.parameter.from)), to = new Date(Number(e.parameter.to));
  var evs = cal_().getEvents(from, to);
  var r = [];
  for (var i = 0; i < evs.length; i++) {
    var ev = evs[i];
    if (ev.getTransparency && ev.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT) continue;
    r.push({ s: ev.getStartTime().getTime(), e: ev.getEndTime().getTime(), d: ev.isAllDayEvent() });
  }
  return out_(r);
}

// POST ?token=…  body JSON {titulo, descricao, inicio(ms), fim(ms), local, id}  →  cria o evento
function doPost(e) {
  if (!ok_(e)) return out_({ erro: 'acesso' });
  var b = JSON.parse(e.postData.contents);
  var cal = cal_();
  var ja = cal.getEvents(new Date(b.inicio), new Date(b.fim), { search: b.id });
  if (ja.length) return out_({ ok: true, id: ja[0].getId(), repetido: true });
  var ev = cal.createEvent(b.titulo, new Date(b.inicio), new Date(b.fim), { description: b.descricao + '\n\nRef: ' + b.id, location: b.local });
  return out_({ ok: true, id: ev.getId() });
}

// Correr uma vez à mão para guardar a chave e pedir autorização.
function configurar() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', 'COLOCAR_AQUI_A_CHAVE');
  cal_();
}
