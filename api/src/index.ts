// ShortPlanet stars: the small API behind the visitors' sky.
//
//   GET    /stars              every star that is shown, newest first
//   GET    /stars/mine         the caller's own star (Authorization: Bearer <token>)
//   PUT    /stars/mine         light or move the caller's star; the first call returns the token
//   DELETE /stars/mine         remove the caller's star
//   GET    /admin/stars        every star, hidden ones included (X-Admin-Key)
//   POST   /admin/stars/:id/hide | /show,  DELETE /admin/stars/:id
//
// There is no sign-in: a visitor's browser keeps a random token, and only its SHA-256 is stored.
// Everything a visitor writes goes through the checker before it is stored, and writes are rate limited.
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { check, tidy } from "./checker";

type Env = {
  DB: D1Database;
  ALLOWED_ORIGINS: string;   // comma-separated origins allowed to call the API from a browser
  ADMIN_KEY?: string;        // secret: wrangler secret put ADMIN_KEY
  HASH_SALT?: string;        // secret: salts the hashed IP addresses used for rate limiting
};
type C = Context<{ Bindings: Env }>;
type Star = { id: string; a: number; h: number; name: string; org: string; word: string; lit: number; hidden?: number };

const WRITES_PER_HOUR = 12;
const ADMIN_FAILURES_PER_HOUR = 10;
const TAU = Math.PI * 2;
const PUBLIC = "id, a, h, name, org, word, lit";
// Two stars may never sit on top of each other. The page already moves a new star to a free spot; this is the
// backstop, measured on a plane where a star at height h sits 1 + h from the centre, so it holds on any screen.
const MIN_GAP = .03;
const gap = (a1: number, h1: number, a2: number, h2: number) => {
  const r1 = 1 + h1, r2 = 1 + h2;
  return Math.sqrt(Math.max(0, r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(a1 - a2)));
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", (c, next) => cors({
  origin: (origin) => (c.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).includes(origin) ? origin : null),
  allowMethods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
  maxAge: 86400,
})(c, next));

/* ---------- helpers ---------- */
const enc = new TextEncoder();
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomId(bytes: number) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// compares the hashes, so the time taken says nothing about how much of the key was right
async function sameSecret(given: string, expected: string) {
  const [x, y] = await Promise.all([sha256(given), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
function bearer(c: C) {
  return /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(c.req.header("Authorization") ?? "")?.[1] ?? null;
}
// Counts what one address does in the current hour, per kind ("write", "admin"), by a salted hash of the address.
async function attemptKey(c: C, kind: string) {
  const hour = Math.floor(Date.now() / 3_600_000);
  return { hour, key: await sha256(`${c.env.HASH_SALT ?? ""}|${kind}|${c.req.header("CF-Connecting-IP") ?? "local"}|${hour}`) };
}
async function bump(c: C, kind: string) {
  const { hour, key } = await attemptKey(c, kind);
  const row = await c.env.DB.prepare(
    "INSERT INTO attempts (key, count, until) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count",
  ).bind(key, (hour + 2) * 3_600_000).first<{ count: number }>();
  if (Math.random() < .05) await c.env.DB.prepare("DELETE FROM attempts WHERE until < ?").bind(Date.now()).run();
  return row?.count ?? 1;
}
async function peek(c: C, kind: string) {
  const { key } = await attemptKey(c, kind);
  return (await c.env.DB.prepare("SELECT count FROM attempts WHERE key = ?").bind(key).first<{ count: number }>())?.count ?? 0;
}
const allowWrite = async (c: C) => (await bump(c, "write")) <= WRITES_PER_HOUR;

/* ---------- visitors ---------- */
app.get("/", (c) => c.text("ShortPlanet stars"));

app.get("/stars", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${PUBLIC} FROM stars WHERE hidden = 0 ORDER BY lit DESC LIMIT 500`).all<Star>();
  c.header("Cache-Control", "public, max-age=20");
  return c.json({ stars: results });
});

app.get("/stars/mine", async (c) => {
  const token = bearer(c);
  if (!token) return c.json({ star: null });
  const star = await c.env.DB.prepare(`SELECT ${PUBLIC}, hidden FROM stars WHERE owner = ?`).bind(await sha256(token)).first<Star>();
  return c.json({ star: star ?? null });
});

app.put("/stars/mine", async (c) => {
  if (Number(c.req.header("Content-Length") ?? 0) > 2048) return c.json({ error: "bad_request" }, 400);
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body || typeof body !== "object") return c.json({ error: "bad_request" }, 400);
  const a = Number(body.a), h = Number(body.h);
  if (!Number.isFinite(a) || !Number.isFinite(h) || h < 0 || h > 1) return c.json({ error: "bad_request" }, 400);

  const entry = tidy(body);
  const problem = check(entry);
  if (problem) return c.json({ error: "refused", field: problem[0], reason: problem[1] }, 422);
  if (!(await allowWrite(c))) return c.json({ error: "too_many" }, 429);

  let token = bearer(c);
  const issued = !token;
  token ??= randomId(24);
  const owner = await sha256(token);
  const existing = await c.env.DB.prepare("SELECT id FROM stars WHERE owner = ?").bind(owner).first<{ id: string }>();
  const { results: near } = await c.env.DB.prepare("SELECT a, h FROM stars WHERE owner != ? AND hidden = 0").bind(owner).all<{ a: number; h: number }>();
  if (near.some((s) => gap(a, h, s.a, s.h) < MIN_GAP)) return c.json({ error: "too_close" }, 409);
  // a star the owner hid stays hidden while its text is unchanged; new text has passed the checker and shows
  await c.env.DB.prepare(
    `INSERT INTO stars (id, owner, a, h, name, org, word, lit, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(owner) DO UPDATE SET a = excluded.a, h = excluded.h, lit = excluded.lit,
       hidden = CASE WHEN stars.name = excluded.name AND stars.org = excluded.org AND stars.word = excluded.word THEN stars.hidden ELSE 0 END,
       name = excluded.name, org = excluded.org, word = excluded.word`,
  ).bind(existing?.id ?? randomId(9), owner, ((a % TAU) + TAU) % TAU, h, entry.name, entry.org, entry.word, Date.now()).run();
  const star = await c.env.DB.prepare(`SELECT ${PUBLIC}, hidden FROM stars WHERE owner = ?`).bind(owner).first<Star>();
  return c.json(issued ? { star, token } : { star });
});

app.delete("/stars/mine", async (c) => {
  const token = bearer(c);
  if (!token) return c.json({ error: "unauthorized" }, 401);
  await c.env.DB.prepare("DELETE FROM stars WHERE owner = ?").bind(await sha256(token)).run();
  return c.body(null, 204);
});

/* ---------- the owner ---------- */
const admin = new Hono<{ Bindings: Env }>();
// Wrong keys are counted per address; after ADMIN_FAILURES_PER_HOUR of them that address waits for the next hour,
// even with the right key, so the key cannot be guessed by trying.
admin.use("*", async (c, next) => {
  if (!c.env.ADMIN_KEY) return c.json({ error: "unauthorized" }, 401);
  if ((await peek(c, "admin")) >= ADMIN_FAILURES_PER_HOUR) return c.json({ error: "too_many" }, 429);
  if (!(await sameSecret(c.req.header("X-Admin-Key") ?? "", c.env.ADMIN_KEY))) { await bump(c, "admin"); return c.json({ error: "unauthorized" }, 401); }
  await next();
});
admin.get("/stars", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT ${PUBLIC}, hidden FROM stars ORDER BY lit DESC LIMIT 1000`).all<Star>();
  return c.json({ stars: results });
});
admin.post("/stars/:id/:act{hide|show}", async (c) => {
  await c.env.DB.prepare("UPDATE stars SET hidden = ? WHERE id = ?").bind(c.req.param("act") === "hide" ? 1 : 0, c.req.param("id")).run();
  return c.body(null, 204);
});
admin.delete("/stars/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM stars WHERE id = ?").bind(c.req.param("id")).run();
  return c.body(null, 204);
});
app.route("/admin", admin);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => { console.error(err); return c.json({ error: "server" }, 500); });

export default app;
