// Ligação à API do TOConline (credenciais nos Secrets do Supabase).
// Token de acesso guardado em config_interna (dura 4 h); renova-se sozinho.
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error("Falta o segredo " + k);
  return v.trim();
};
const semBarra = (u: string) => u.replace(/\/+$/, "");

async function pedirToken(): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const oauth = semBarra(env("TOCONLINE_OAUTH_URL"));
  const id = env("TOCONLINE_CLIENT_ID");
  const segredo = env("TOCONLINE_CLIENT_SECRET");
  const redirect = env("TOCONLINE_REDIRECT_URI");
  // 1) código de autorização (vem no cabeçalho Location do 302)
  const u = `${oauth}/auth?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=commercial`;
  if (!/^https:\/\//.test(oauth)) throw new Error("TOCONLINE_OAUTH_URL não parece um endereço https");
  let r1: Response;
  try { r1 = await fetch(u, { redirect: "manual", headers: { "Content-Type": "application/json" } }); }
  catch { throw new Error("TOConline /auth inacessível"); }
  const loc = r1.headers.get("location") || "";
  await r1.body?.cancel();
  const code = loc ? new URL(loc, oauth).searchParams.get("code") : null;
  if (!code) throw new Error(`TOConline /auth sem código (HTTP ${r1.status})`);
  // 2) troca por token
  const r2 = await fetch(`${oauth}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic " + btoa(`${id}:${segredo}`),
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, scope: "commercial" }),
  });
  const j = await r2.json().catch(() => ({}));
  if (!r2.ok || !j.access_token) throw new Error(`TOConline /token falhou (HTTP ${r2.status})`);
  return j;
}

export async function tocToken(sb: SupabaseClient, forcar = false): Promise<string> {
  if (!forcar) {
    const { data } = await sb.from("config_interna").select("chave,valor").in("chave", ["TOC_ACCESS", "TOC_EXPIRA"]);
    const m = Object.fromEntries((data || []).map((x: any) => [x.chave, x.valor]));
    if (m.TOC_ACCESS && Number(m.TOC_EXPIRA) > Date.now() + 5 * 60_000) return m.TOC_ACCESS;
  }
  const t = await pedirToken();
  const expira = String(Date.now() + (t.expires_in || 14400) * 1000);
  await sb.from("config_interna").upsert([
    { chave: "TOC_ACCESS", valor: t.access_token, atualizado: new Date().toISOString() },
    { chave: "TOC_EXPIRA", valor: expira, atualizado: new Date().toISOString() },
  ]);
  return t.access_token;
}

export async function toc(sb: SupabaseClient, metodo: string, caminho: string, corpo?: unknown): Promise<{ status: number; json: any; texto: string }> {
  const base = semBarra(env("TOCONLINE_API_URL"));
  if (!/^https:\/\//.test(base)) throw new Error("TOCONLINE_API_URL não parece um endereço https");
  const fazer = async (tok: string) =>
    fetch(`${base}/${caminho.replace(/^\/+/, "")}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/vnd.api+json",
        Accept: "application/json",
        Authorization: "Bearer " + tok,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  let r = await fazer(await tocToken(sb));
  if (r.status === 401) r = await fazer(await tocToken(sb, true));
  const texto = await r.text();
  let json: any = null;
  try { json = JSON.parse(texto); } catch { /* não-JSON */ }
  return { status: r.status, json, texto };
}

export async function adminOk(sb: SupabaseClient, req: Request): Promise<boolean> {
  const dado = req.headers.get("x-admin") || "";
  if (!dado) return false;
  const { data } = await sb.from("config_interna").select("valor").eq("chave", "ADMIN_TOKEN").maybeSingle();
  return !!data && data.valor === dado;
}
