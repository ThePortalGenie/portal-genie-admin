# Portal Genie Admin

Internal administration application for **The Portal Genie**.

Frontend-only Angular app. APIs, databases, authentication, and email delivery will be connected later behind service abstractions. Do not implement backend infrastructure, Postmark, or email sending here.

## Current implementation status

**Phase 4 — Rule Builder.** Administrators can create and edit engagement rules at `/engagement/rules/new` and `/engagement/rules/:id`. The editor defines who qualifies (one condition group), when the communication should become eligible, and which system template to send. Data remains mock-backed. Create defaults to **Disabled**.

Still not built: template library UI, Customer Usage, Settings, HTTP APIs, authentication, email delivery, nested condition-group UI, recipient preview.

The sidebar uses a **text brand treatment**. A clean reusable Portal Genie G-mark is not in the repository; supply a transparent logo asset before replacing the text lockup. Do not invent or redraw the logo.

## Run locally

Requires Node.js 20+ (this repo was scaffolded with Node 24 and npm 11).

```bash
npm install
npm start
```

Then open http://localhost:4200/. The CLI redirects `/` to `/engagement/rules`.

## Build

```bash
npm run build
```

Output: `dist/portal-genie-admin/`.

## Tests

```bash
npm test
```

Vitest runs focused unit tests of domain and editor logic (no TestBed).

## Type check

Use the no-emit type check. Do **not** run `tsc -b` as a verification step — that previously emitted JavaScript next to the TypeScript sources.

```bash
npm run typecheck
```

This runs `tsc -p tsconfig.typecheck.json --noEmit`. Application `tsconfig` files also set `"noEmit": true`, so a stray `tsc -b` will not write `.js` files into `src/`.

## Current routes

| Path | Page |
| --- | --- |
| `/` | Redirect to `/engagement/rules` |
| `/engagement/rules` | Rules list (mock data) |
| `/engagement/rules/new` | Create Rule |
| `/engagement/rules/:id` | Edit Rule (loads the mock rule; unknown ids show not found) |
| `/engagement/templates` | Communication Templates placeholder |
| any other path | Page not found (inside the shell) |

## Rule Builder notes

- Presentation injects `RuleService`, `TemplateService`, and `MetricCatalogService`. Pages do not import `mock/` fixtures.
- New rules default to Disabled until the administrator chooses Active.
- v1 shows one AND/OR condition group. Nested groups remain in the domain model only.
- Boolean conditions use a Yes/No control and are stored as `is_true` / `is_false` (catalog operators).
- Date metrics in conditions support `is_empty` only (approved catalog). Timing uses registration (after) and trial expiry (before/after).
- Save is disabled while blocking validation errors exist. A delay of more than 365 days is a warning only.
- Cancel confirms when the draft differs from the loaded/created snapshot.

## Phase 3 implementation notes

- Duplicate runs on the list via `RuleService.duplicate()`. Copies are named `{name} (Copy)` (then `(Copy 2)`, …) and always start as **Disabled**.
- Overview counts (total / active / disabled) are taken from the full loaded set, not the filtered view.
- Search is client-side (name, description, and template name).
- Narrow viewports keep all table columns and scroll horizontally.

## Documentation map

| Location | Purpose |
| --- | --- |
| `Portal Genie Brand Guide.docx` | Authoritative brand identity (colours, logos). |
| `docs/BRAND_AND_DESIGN.md` | UI and design standards. |
| `docs/features/customer-engagement.md` | Customer Engagement feature specification. |
| `docs/features/customer-usage.md` | Future Customer Usage module (not implemented). |
| `docs/architecture/` | Application architecture, routes, UX, domain model, metric catalog, services. |
| `src/styles/_tokens.scss` | Implemented design tokens. |
| `.cursor/rules/` | Cursor rules for future development. |

### Architecture

| File | Purpose |
| --- | --- |
| `docs/architecture/application-architecture.md` | Overview, decisions, resolved product questions. |
| `docs/architecture/navigation-and-routes.md` | Sitemap, routes, shell, responsive behaviour. |
| `docs/architecture/customer-engagement-ux.md` | Rules list, editor, template library. |
| `docs/architecture/domain-model.md` | Conceptual frontend models. |
| `docs/architecture/metric-catalog.md` | Metric catalog. |
| `docs/architecture/frontend-services.md` | Service abstractions and folder plan. |

## Source of truth

1. **Brand identity** — `Portal Genie Brand Guide.docx`, applied through `docs/BRAND_AND_DESIGN.md`.
2. **Product behaviour** — `docs/features/customer-engagement.md`.
3. **Application structure and UX** — `docs/architecture/`.
4. **How to build** — `.cursor/rules/`.
