# chinny-swg.github.io

Documentation site for the [`chinny-swg`](https://github.com/chinny-swg) SWGEmu Core3 fork. Built with [Starlight](https://starlight.astro.build/) (Astro).

Published at **https://chinny-swg.github.io/** via GitHub Actions (see `.github/workflows/deploy.yml`).

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
```

| Command | Action |
|---------|--------|
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the built site locally |

## Content

Docs live in `src/content/docs/`. The sidebar is configured in `astro.config.mjs`.

> ⚠️ This is a public site — never commit real secrets (passwords, private IPs). Use placeholders like `<ADMIN_PASSWORD>` / `<SERVER_LAN_IP>`.
