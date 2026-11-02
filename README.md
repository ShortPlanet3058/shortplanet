# ShortPlanet

Finn Vignon's portfolio: a small planet you walk around, one building per project, and a sky where visitors light stars.

- `site/` is the website, a single page with no build step, served by GitHub Pages.
- `api/` is the star API, a Cloudflare Worker (TypeScript, Hono) with a D1 database.
- `shortplanet.html` is the earlier prototype that ran on claude.ai.

## How the stars work

There is no sign-in. When a visitor lights a star, the API gives their browser a random token, and only its SHA-256 is
stored; the token lets them move or remove that one star later. Every first name, company and message goes through the
checker in `api/src/checker.ts` before it is stored, so anything the API lists can be shown. Writes are limited to 12 an
hour per address (hashed with a salt, never stored in the clear).

The owner sees everyone who lit a star at `https://theshortplanet.uk/#admin`, after typing the admin key once. Hide
keeps a star in the database but out of the sky until its words change; Remove deletes it.

To add an AI judge later (NVIDIA, Mistral or any other model), call it in `PUT /stars/mine` in `api/src/index.ts`,
right after `check(entry)` passes, and answer `422 { field, reason: "notKind" }` when it says no.

## Run it locally

```bash
cd api && npm install
```

```bash
cd api && printf 'ADMIN_KEY=local-admin-key\nHASH_SALT=local-salt\n' > .dev.vars && npm run db:local
```

```bash
cd api && npm run dev
```

Then serve `site/` on port 8765 and open it with the local API:

```bash
python3 -m http.server 8765 --directory site
```

Open http://localhost:8765/?api=http://127.0.0.1:8787 (the `?api=` override only works on localhost).

Tests:

```bash
cd api && npm test
```

## Deploy

### The star API (Cloudflare)

1. Create the database and copy the `database_id` it prints into `api/wrangler.toml`:

   ```bash
   cd api && npx wrangler d1 create shortplanet-stars
   ```

2. Create the tables:

   ```bash
   cd api && npm run db:remote
   ```

3. Set the two secrets (use long random values; keep the admin key somewhere safe):

   ```bash
   cd api && npx wrangler secret put ADMIN_KEY
   ```

   ```bash
   cd api && npx wrangler secret put HASH_SALT
   ```

4. Deploy:

   ```bash
   cd api && npm run deploy
   ```

5. Give it its address. If theshortplanet.uk's DNS is on Cloudflare, add a custom domain `stars.theshortplanet.uk` to the
   Worker (Workers & Pages > shortplanet-stars > Settings > Domains). Otherwise use the `*.workers.dev` address Wrangler
   printed, and put it in `site/index.html`, in `<meta name="star-api">`.

### The site (GitHub Pages)

1. Push this repository to GitHub, then in Settings > Pages choose "GitHub Actions" as the source. The workflow in
   `.github/workflows/pages.yml` publishes `site/` on every push to `main`.
2. Custom domain: add a `site/CNAME` file containing `theshortplanet.uk`, set the domain in Settings > Pages, and point
   the DNS at GitHub Pages (four `A` records for the bare domain, or a `CNAME` to `<user>.github.io` for a subdomain).
   Tick "Enforce HTTPS" once the certificate is issued.
3. If the site lives on another address, add it to `ALLOWED_ORIGINS` in `api/wrangler.toml` and deploy the API again.
