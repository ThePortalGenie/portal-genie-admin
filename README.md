# Portal Genie Admin

Internal administration application for **The Portal Genie**.

Frontend-only Angular app. APIs, databases, authentication, and email delivery will be connected later behind service abstractions. Do not implement backend infrastructure, Postmark, or email sending here.

## Current implementation status

**Phase 3 — Rules management.** The branded shell from Phase 2 now hosts a production-quality Rules list at `/engagement/rules`. Administrators can search, filter, duplicate, enable/disable, and delete mock rules. Create and Edit still open placeholder pages — the visual Rule Builder is not built yet.

Not yet built: rule builder, template library UI, Customer Usage, Settings, HTTP APIs, authentication, email delivery.

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

Focused unit tests cover search/filter behaviour, duplicate naming, duplicate status, and human-readable rule summaries. Vitest runs these as pure TypeScript tests (no TestBed).

## Current routes

| Path | Page |
| --- | --- |
| `/` | Redirect to `/engagement/rules` |
| `/engagement/rules` | Rules list (mock data) |
| `/engagement/rules/new` | Create Rule placeholder |
| `/engagement/rules/:id` | Edit Rule placeholder (no data fetch) |
| `/engagement/templates` | Communication Templates placeholder |
| any other path | Page not found (inside the shell) |

## Phase 3 implementation notes

- Presentation pages inject `RuleService`, `TemplateService`, and `MetricCatalogService`. Mock adapters are provided in `app.config.ts` and can be replaced with HTTP implementations later without rewriting the list page.
- Sample rules and templates live under `src/app/core/data/mock/`. Feature pages do not import that folder.
- Duplicate runs on the list via `RuleService.duplicate()`. Copies are named `{name} (Copy)` (then `(Copy 2)`, …) and always start as **Disabled**.
- Overview counts (total / active / disabled) are taken from the full loaded set, not the filtered view. They are a configuration summary, not analytics.
- Search is client-side and immediate (name, description, and template name). The mock list is small enough that debounce is unnecessary.
- Narrow viewports keep all table columns and scroll horizontally rather than stacking a seven-column grid.
- Disabling an active rule still asks for confirmation (approved UX). Enabling does not.
- Create / update (`RuleDraft`) is not on the service yet; it belongs with the Rule Builder.

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
| `docs/architecture/customer-engagement-ux.md` | Rules list, editor, template library (editor/library not built yet). |
| `docs/architecture/domain-model.md` | Conceptual frontend models. |
| `docs/architecture/metric-catalog.md` | Metric catalog. |
| `docs/architecture/frontend-services.md` | Service abstractions and folder plan. |

## Source of truth

1. **Brand identity** — `Portal Genie Brand Guide.docx`, applied through `docs/BRAND_AND_DESIGN.md`.
2. **Product behaviour** — `docs/features/customer-engagement.md`.
3. **Application structure and UX** — `docs/architecture/`.
4. **How to build** — `.cursor/rules/`.
