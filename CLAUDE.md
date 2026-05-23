# jobs (Pro)

Job board on ProAppStore — browse, search, save, and apply to jobs.

- Subdomain: `jobs.proappstore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build` (runs platform compliance check via prebuild)
- Deploy: `git push origin main` (auto-deploys via Cloudflare Pages)

For platform conventions, read SKILLS.md:
https://raw.githubusercontent.com/proappstore-online/proappstore/main/SKILLS.md

## Repo-specific notes

- **Schema in code** — migrations in `web/src/lib/db/core.ts`, run lazily via `ensureMigrated()`
- **SDK hooks** — `useProAuth` from `@proappstore/sdk/hooks`
- **Hash routing** — `#/`, `#/job/:id`, `#/company/:slug`, `#/saved`
- **No external API yet** — seed data in D1, later ingested from GotJob scrapers
