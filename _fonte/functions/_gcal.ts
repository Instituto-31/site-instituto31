// Agenda Google via Apps Script (coordenacao@ → calendário "Psicotécnicos").
function tzOffsetMs(tz: string, utcMs: number) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
}
export function localToUtc(y: number, mo: number, d: number, h: number, mi: number, tz = "Europe/Lisbon") {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMs(tz, guess);
  return guess - tzOffsetMs(tz, guess - off);
}
export async function ocupadosGoogle(from: number, to: number) {
  const su = Deno.env.get("GCAL_SCRIPT_URL"), tk = Deno.env.get("GCAL_SCRIPT_TOKEN");
  if (!su || !tk) return [];
  try {
    const r = await fetch(`${su}?token=${encodeURIComponent(tk)}&from=${from}&to=${to}`, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    const j = await r.json();
    if (Array.isArray(j)) return j.map((x: { s: number; e: number }) => ({ start: x.s, end: x.e }));
    console.error("gcal script", j);
  } catch (e) { console.error("gcal script", e); }
  return [];
}
export function convite(opts: { uid: string; inicioUtc: number; fimUtc: number; titulo: string; descricao: string; local: string; para: string }) {
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Instituto 31//Site//PT", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${opts.uid}@instituto31.pt`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(opts.inicioUtc)}`, `DTEND:${f(opts.fimUtc)}`,
    `SUMMARY:${esc(opts.titulo)}`, `DESCRIPTION:${esc(opts.descricao)}`, `LOCATION:${esc(opts.local)}`,
    "ORGANIZER;CN=Instituto 31:mailto:geral@instituto31.pt",
    `ATTENDEE;CN=Agenda;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${opts.para}`,
    "STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
export async function criarEventoGoogle(ev: { id: string; titulo: string; descricao: string; inicio: number; fim: number; local: string }) {
  const su = Deno.env.get("GCAL_SCRIPT_URL"), tk = Deno.env.get("GCAL_SCRIPT_TOKEN");
  if (!su || !tk) return false;
  try {
    const r = await fetch(`${su}?token=${encodeURIComponent(tk)}`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(ev), redirect: "follow", signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    return !!j.ok;
  } catch (e) { console.error("gcal criar", e); return false; }
}
