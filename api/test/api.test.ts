// Runs the Worker's routes against a real SQLite database in memory, through a small stand-in for D1.
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/index";

function fakeD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const statement = (sql: string, args: SQLInputValue[] = []) => ({
    bind: (...a: SQLInputValue[]) => statement(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
  });
  return { prepare: (sql: string) => statement(sql) };
}

const SITE = "https://theshortplanet.uk";
let env: Record<string, unknown>;
beforeEach(() => {
  env = { DB: fakeD1(), ALLOWED_ORIGINS: `${SITE},http://localhost:8765`, ADMIN_KEY: "owner-key-for-tests", HASH_SALT: "salt" };
});

const call = (path: string, init: RequestInit & { token?: string; admin?: string } = {}) => {
  const headers = new Headers(init.headers);
  headers.set("Origin", SITE);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.admin) headers.set("X-Admin-Key", init.admin);
  return app.request(path, { ...init, headers }, env);
};
const light = (body: object, token?: string) => call("/stars/mine", { method: "PUT", body: JSON.stringify(body), token });

describe("visitors", () => {
  it("lights a star, gets a token back, and finds it again with that token", async () => {
    const res = await light({ a: 1, h: .5, name: "Léa", org: "Capgemini", word: "hello from Lyon" });
    expect(res.status).toBe(200);
    const { star, token } = await res.json() as any;
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(star).toMatchObject({ a: 1, h: .5, name: "Léa", org: "Capgemini", word: "hello from Lyon", hidden: 0 });

    const all = await (await call("/stars")).json() as any;
    expect(all.stars).toHaveLength(1);
    expect(all.stars[0]).not.toHaveProperty("owner");
    const mine = await (await call("/stars/mine", { token })).json() as any;
    expect(mine.star.id).toBe(star.id);
  });

  it("moves the same star when the token comes back, instead of lighting a second one", async () => {
    const { star, token } = await (await light({ a: 1, h: .5 })).json() as any;
    const res = await light({ a: 2, h: .7, word: "moved" }, token);
    const again = await res.json() as any;
    expect(again.star.id).toBe(star.id);
    expect(again).not.toHaveProperty("token");
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(1);
  });

  it("refuses what the checker stops, says which field and why, and stores nothing", async () => {
    const res = await light({ a: 1, h: .5, name: "Elon", word: "hi" });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "refused", field: "name", reason: "notName" });
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(0);
  });

  it("never lets a star sit on top of another", async () => {
    await light({ a: 1, h: .5 });
    const res = await light({ a: 1.005, h: .505 });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "too_close" });
    expect((await light({ a: 1.2, h: .5 })).status).toBe(200);
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(2);
  });

  it("lets a visitor move their own star a little, and ignores stars the owner hid", async () => {
    const { star, token } = await (await light({ a: 2, h: .5 })).json() as any;
    expect((await light({ a: 2.005, h: .5 }, token)).status).toBe(200);
    await call(`/admin/stars/${star.id}/hide`, { method: "POST", admin: "owner-key-for-tests" });
    expect((await light({ a: 2.005, h: .5 })).status).toBe(200);
  });

  it("rejects positions outside the sky", async () => {
    expect((await light({ a: 1, h: 3 })).status).toBe(400);
    expect((await light({ a: "x", h: .5 })).status).toBe(400);
  });

  it("removes the caller's star", async () => {
    const { token } = await (await light({ a: 1, h: .5 })).json() as any;
    expect((await call("/stars/mine", { method: "DELETE", token })).status).toBe(204);
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(0);
  });

  it("slows down a burst of writes from one address", async () => {
    const codes = [];
    for (let i = 0; i < 14; i++) codes.push((await light({ a: i / 10, h: .5 })).status);
    expect(codes.slice(0, 12).every((c) => c === 200)).toBe(true);
    expect(codes.slice(12)).toEqual([429, 429]);
  });

  it("answers browsers from the site, and not from elsewhere", async () => {
    const ok = await call("/stars");
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
    const other = await app.request("/stars", { headers: { Origin: "https://evil.example" } }, env);
    expect(other.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("the owner", () => {
  it("needs the admin key", async () => {
    expect((await call("/admin/stars")).status).toBe(401);
    expect((await call("/admin/stars", { admin: "wrong" })).status).toBe(401);
    expect((await call("/admin/stars", { admin: "owner-key-for-tests" })).status).toBe(200);
  });

  it("locks an address out for the hour after ten wrong keys, even with the right one", async () => {
    for (let i = 0; i < 10; i++) expect((await call("/admin/stars", { admin: `wrong-${i}` })).status).toBe(401);
    expect((await call("/admin/stars", { admin: "wrong-again" })).status).toBe(429);
    expect((await call("/admin/stars", { admin: "owner-key-for-tests" })).status).toBe(429);
  });

  it("does not count the right key as a failure", async () => {
    for (let i = 0; i < 12; i++) expect((await call("/admin/stars", { admin: "owner-key-for-tests" })).status).toBe(200);
  });

  it("hides a star; it stays hidden until its words change", async () => {
    const { star, token } = await (await light({ a: 1, h: .5, word: "keep building" })).json() as any;
    expect((await call(`/admin/stars/${star.id}/hide`, { method: "POST", admin: "owner-key-for-tests" })).status).toBe(204);
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(0);

    const same = await (await light({ a: 2, h: .6, word: "keep building" }, token)).json() as any;
    expect(same.star.hidden).toBe(1);
    const changed = await (await light({ a: 2, h: .6, word: "new words" }, token)).json() as any;
    expect(changed.star.hidden).toBe(0);
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(1);
  });

  it("sees hidden stars, shows them again, and removes them", async () => {
    const { star } = await (await light({ a: 1, h: .5, word: "hello" })).json() as any;
    const admin = { admin: "owner-key-for-tests" };
    await call(`/admin/stars/${star.id}/hide`, { method: "POST", ...admin });
    expect((await (await call("/admin/stars", admin)).json() as any).stars[0].hidden).toBe(1);
    await call(`/admin/stars/${star.id}/show`, { method: "POST", ...admin });
    expect((await (await call("/stars")).json() as any).stars).toHaveLength(1);
    expect((await call(`/admin/stars/${star.id}`, { method: "DELETE", ...admin })).status).toBe(204);
    expect((await (await call("/admin/stars", admin)).json() as any).stars).toHaveLength(0);
  });
});
