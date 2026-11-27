// Leitura da agenda Google (endereço iCal secreto) para bloquear vagas ocupadas.
// Devolve intervalos ocupados em milissegundos UTC.

function tzOffsetMs(tz: string, utcMs: number) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
}
// hora local num fuso -> UTC ms
export function localToUtc(y: number, mo: number, d: number, h: number, mi: number, tz = "Europe/Lisbon") {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let off = 0;
  try { off = tzOffsetMs(tz, guess); } catch { off = tzOffsetMs("Europe/Lisbon", guess); }
  const t = guess - off;
  let off2 = off;
  try { off2 = tzOffsetMs(tz, t); } catch { /* */ }
  return guess - off2;
}

type Ev = { start: number; end: number; allDay: boolean; rrule?: Record<string, string>; exdates: Set<number>; uid: string; recId?: number; tz: string; sLocal?: number[] };

function parseDt(prop: string, val: string): { ms: number; allDay: boolean; tz: string; local: number[] } {
  const tzm = prop.match(/TZID=([^;:]+)/);
  const tz = tzm ? tzm[1] : "Europe/Lisbon";
  if (/VALUE=DATE(?!-)/.test(prop) || /^\d{8}$/.test(val)) {
    const y = +val.slice(0, 4), m = +val.slice(4, 6), d = +val.slice(6, 8);
    return { ms: localToUtc(y, m, d, 0, 0, "Europe/Lisbon"), allDay: true, tz: "Europe/Lisbon", local: [y, m, d, 0, 0] };
  }
  const y = +val.slice(0, 4), m = +val.slice(4, 6), d = +val.slice(6, 8), h = +val.slice(9, 11), mi = +val.slice(11, 13);
  if (val.endsWith("Z")) return { ms: Date.UTC(y, m - 1, d, h, mi), allDay: false, tz: "UTC", local: [y, m, d, h, mi] };
  return { ms: localToUtc(y, m, d, h, mi, tz), allDay: false, tz, local: [y, m, d, h, mi] };
}
function parseDur(v: string) {
  const m = v.match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!m) return 0;
  return (((+(m[1] ?? 0) * 7 + +(m[2] ?? 0)) * 24 + +(m[3] ?? 0)) * 60 + +(m[4] ?? 0)) * 60000 + +(m[5] ?? 0) * 1000;
}

export function parseIcs(txt: string): Ev[] {
  const lines = txt.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const evs: Ev[] = [];
  let cur: Record<string, string[]> | null = null;
  for (const l of lines) {
    if (l === "BEGIN:VEVENT") { cur = {}; continue; }
    if (l === "END:VEVENT" && cur) {
      const get = (k: string) => Object.keys(cur!).find((x) => x === k || x.startsWith(k + ";"));
      const ks = get("DTSTART");
      if (ks && (cur["STATUS"]?.[0] ?? "") !== "CANCELLED" && (cur["TRANSP"]?.[0] ?? "OPAQUE") !== "TRANSPARENT") {
        const s = parseDt(ks, cur[ks][0]);
        const ke = get("DTEND");
        let end: number;
        if (ke) end = parseDt(ke, cur[ke][0]).ms;
        else if (cur["DURATION"]) end = s.ms + parseDur(cur["DURATION"][0]);
        else end = s.ms + (s.allDay ? 86400000 : 0);
        const ex = new Set<number>();
        for (const k of Object.keys(cur).filter((x) => x === "EXDATE" || x.startsWith("EXDATE;"))) {
          for (const v of cur[k]) for (const one of v.split(",")) ex.add(parseDt(k, one).ms);
        }
        const kr = get("RECURRENCE-ID");
        const rr = cur["RRULE"]?.[0];
        evs.push({
          start: s.ms, end, allDay: s.allDay, exdates: ex, uid: cur["UID"]?.[0] ?? "", tz: s.tz, sLocal: s.local,
          rrule: rr ? Object.fromEntries(rr.split(";").map((p) => p.split("=") as [string, string])) : undefined,
          recId: kr ? parseDt(kr, cur[kr][0]).ms : undefined,
        });
      }
      cur = null; continue;
    }
    if (cur) {
      const i = l.indexOf(":");
      if (i > 0) { const k = l.slice(0, i), v = l.slice(i + 1); (cur[k] ??= []).push(v); }
    }
  }
  return evs;
}

const DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function expandir(evs: Ev[], from: number, to: number) {
  const out: { start: number; end: number }[] = [];
  const overrides = new Map<string, Set<number>>();
  for (const e of evs) if (e.recId !== undefined) { if (!overrides.has(e.uid)) overrides.set(e.uid, new Set()); overrides.get(e.uid)!.add(e.recId); }
  for (const e of evs) {
    const dur = e.end - e.start;
    if (!e.rrule || e.recId !== undefined) { if (e.end > from && e.start < to) out.push({ start: e.start, end: e.end }); continue; }
    const r = e.rrule, freq = r.FREQ, interval = +(r.INTERVAL ?? 1);
    const until = r.UNTIL ? parseDt(r.UNTIL.length === 8 ? "VALUE=DATE" : "", r.UNTIL).ms + (r.UNTIL.length === 8 ? 86400000 : 0) : Infinity;
    const count = r.COUNT ? +r.COUNT : Infinity;
    const byday = r.BYDAY ? r.BYDAY.split(",").map((x) => x.replace(/^[+-]?\d+/, "")) : null;
    const [y0, m0, d0, h0, mi0] = e.sLocal!;
    const tz = e.tz === "UTC" ? "UTC" : e.tz;
    const ex = new Set([...e.exdates, ...(overrides.get(e.uid) ?? [])]);
    const base = Date.UTC(y0, m0 - 1, d0);
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      const day = new Date(base + i * 86400000);
      const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate(), w = day.getUTCDay();
      let hit = false;
      if (freq === "DAILY") hit = i % interval === 0;
      else if (freq === "WEEKLY") {
        const week = Math.floor((i + ((new Date(base).getUTCDay() + 6) % 7)) / 7);
        hit = week % interval === 0 && (byday ? byday.includes(DOW[w]) : w === new Date(base).getUTCDay());
      } else if (freq === "MONTHLY") {
        const months = (y - y0) * 12 + (m - m0);
        hit = months % interval === 0 && d === d0;
      } else if (freq === "YEARLY") hit = (y - y0) % interval === 0 && m === m0 && d === d0;
      if (!hit) continue;
      const st = tz === "UTC" ? Date.UTC(y, m - 1, d, h0, mi0) : localToUtc(y, m, d, h0, mi0, tz);
      if (st > until || n >= count) break;
      n++;
      if (st > to) break;
      if (ex.has(st)) continue;
      if (st + dur > from) out.push({ start: st, end: st + dur });
    }
  }
  return out;
}

export async function ocupadosGoogle(from: number, to: number) {
  const su = Deno.env.get("GCAL_SCRIPT_URL"), tk = Deno.env.get("GCAL_SCRIPT_TOKEN");
  if (su && tk) {
    try {
      const r = await fetch(`${su}?token=${encodeURIComponent(tk)}&from=${from}&to=${to}`, { signal: AbortSignal.timeout(8000), redirect: "follow" });
      const j = await r.json();
      if (Array.isArray(j)) return j.map((x: { s: number; e: number }) => ({ start: x.s, end: x.e }));
      console.error("gcal script", j);
    } catch (e) { console.error("gcal script", e); }
    return [];
  }
  const url = Deno.env.get("GCAL_ICS_URL");
  if (!url) return [];
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    return expandir(parseIcs(await r.text()), from, to);
  } catch (e) { console.error("gcal", e); return []; }
}

// Convite de calendário (.ics) para enviar por email e aparecer na agenda
export function convite(opts: { uid: string; inicioUtc: number; fimUtc: number; titulo: string; descricao: string; local: string; para: string }) {
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
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
