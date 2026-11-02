# ShortPlanet

My portfolio, as a small planet you walk around: **[theshortplanet.uk](https://theshortplanet.uk)**

Each building on the planet is one of my projects, and it shows what the project does: a git history climbing the
archive's walls, a watchtower mapping a network, portals for my Minecraft worlds. Visitors arrive by rocket and can
light a star in the sky before they leave, with their first name, company or a few words.

- `site/` is the website: a single page drawn on a canvas, in English and French, hosted on GitHub Pages.
- `api/` keeps the visitors' stars: a Cloudflare Worker in TypeScript (Hono, D1) that checks every message
  automatically before it appears.

Made by [Finn Vignon](https://github.com/ShortPlanet3058), computer science student at Epitech.
