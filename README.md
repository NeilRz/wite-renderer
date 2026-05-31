# WITE Renderer

Internal image generator for WITE Ceintures. Composites a model archetype + belt + buckle + setting + pose into a brand-style editorial render using Google's Gemini 3 Pro Image (Nano Banana Pro).

## Local development

```bash
npm install
cp .env.local.example .env.local      # fill in keys
npm run build-catalog                  # regenerate data/catalog.json
npm run dev                            # http://localhost:3000
```

## Environment variables

| Name              | Where                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| `GEMINI_API_KEY`  | Google AI Studio → API keys. Billing enabled.                          |
| `APP_PASSWORD`    | The single shared password for the team. Anyone with it can log in.    |
| `AUTH_SECRET`     | Random 32-byte base64 string. Used to sign auth cookies. **Generate a fresh one in production.** |

Generate a fresh `AUTH_SECRET` with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Catalog data

Product images live in `public/catalog/belts/` and `public/catalog/buckles/`. Add or remove files there, then re-run `npm run build-catalog` to refresh `data/catalog.json`.

## Deployment

Vercel auto-detects Next.js. Set the three env vars above in the project settings before first deploy. The render endpoint streams (NDJSON heartbeats) so it works on Hobby tier within the 25 s edge ceiling for most renders; if a render goes long, consider Pro for the 60 s ceiling.
