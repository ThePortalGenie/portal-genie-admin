# Frontend Services, Angular Structure, and UI Components

**Status:** Phase 1 approved; Phase 2 initialises the Angular shell.

---

## Service boundaries

Presentation components depend on **abstract services** (injection tokens or abstract classes). Mock adapters implement them in v1. HTTP adapters replace mocks later **without changing pages**.

No service in this list sends email, talks to Postmark, evaluates customer populations, schedules jobs, or tracks send history.

### RuleService

**Owns:** engagement **definitions** (authoring records).

- List rules (for the table; filtering may be client-side in v1)
- Get one rule by id
- Duplicate a rule (`duplicate(id)` — used by the Rules list; copies are Disabled and stay in the same group at the end of that group’s display order)
- Create / update from `RuleDraft`
- Set status (active / disabled)
- Delete

**Does not own:** templates, metric definitions, customer lists, evaluation, execution, delivery, communication history, rule group catalog.

### RuleGroupService

**Owns:** the extensible **rule group** catalog (journeys such as Trial & Onboarding). Separate from rule categories.

- List groups
- Get one by id

Presentation never imports mock fixtures. Groups and `sequenceOrder` are organisational metadata only; this service does not evaluate or orchestrate journeys.

### TemplateService

**Owns:** read-only communication template catalog (system-provided).

- List templates
- Get one by id

**Does not own:** create, update, activate/deactivate, body editing, send, provider ids. Future management APIs may be added later; v1 must not expose write methods on this service.

### MetricCatalogService

**Owns:** metric definitions used by the condition builder (and later Usage), including **centralised mock enum values** for trial and account status.

- List metrics
- Get one by key
- Optionally: operators for a type

v1 may load a static mock catalog through this service so the UI never imports a raw array or hard-codes status values in components.

### RuleCategoryCatalog (or a method on a small catalog service)

**Owns:** the extensible **rule** category list (Onboarding, Adoption, …). Separate from template categories. Presentation reads labels from here.

### CustomerUsageService

**Reserved.** Do not implement in v1.

Future responsibilities: overall usage snapshot, customer list, customer detail, activity/adoption readings keyed by the same metric keys.

Engagement must not call this service for recipient preview (out of scope).

### Supporting domain (not always a service)

| Name | Role |
| --- | --- |
| `RuleValidation` | Pure functions: `RuleDraft` + catalogs → `ValidationResult`. Not an HTTP service. |
| `RuleSummary` | Pure functions: draft → human-readable string. |

Keep these in `features/customer-engagement/validation/` (and a small summary helper), not in `core/`.

---

## Adapter rule

```
Page → RuleService (abstract)
           ↓
     MockRuleService     or later HttpRuleService
```

Provide the mock in the application config until APIs exist. Feature components never import `mock/` files.

Seed data lives only inside mock adapters.

---

## Proposed Angular feature structure

Matches project rules: `layout/`, `core/`, `shared/`, `features/<name>/`.

**Phase 2 created:** `layout/` (shell, sidebar, page header), `shared/ui/` (button, breadcrumb), Customer Engagement **placeholder pages**, and routing. `core/domain` and `core/data` are not created until the rule-management phase.

```
src/app/
  app.routes.ts                    # compose feature routes; / → engagement/rules
  app.config.ts                    # providers: mock services
  layout/
    app-shell                      # sidebar + content outlet
    sidebar
    page-header                    # breadcrumb, title, description, actions slot
  core/
    domain/
      metric.types.ts
      template.types.ts
      rule-category.types.ts       # extensible rule category catalog
      # trial/account enum values live with the metric catalog fixtures — not in components
    data/
      rule.service.ts              # abstract
      rule-group.service.ts
      template.service.ts
      metric-catalog.service.ts
      mock/
        mock-rule.service.ts
        mock-rule-group.service.ts
        mock-template.service.ts
        mock-metric-catalog.service.ts
        fixtures/                  # JSON/TS fixtures, not used by components
  shared/
    ui/
      # see inventory below — only true primitives
  features/
    customer-engagement/
      customer-engagement.routes.ts
      models/
        rule.model.ts
        validation.model.ts
      validation/
        rule-validator.ts
        rule-summary.ts
      rules/
        rules-list.page.ts
        rule-group.page.ts
        rule-group.helpers.ts
      rule-editor/
        rule-editor.page.ts
        condition-row.ts
        condition-list.ts          # combinator + rows (one group)
        timing-fields.ts
        rule-summary-card.ts
        template-picker.ts
      templates/
        template-library.page.ts
        template-card.ts
        template-detail-panel.ts
    customer-usage/
      # reserved: routes file that renders “not available yet” if needed
```

Naming: kebab-case files, PascalCase classes, services end with `Service`.

Do **not** create a catch-all `features/customer-engagement/components/` dumping ground. Keep editor pieces next to the editor.

---

## Reusable UI components

Build shared primitives only when a second call site exists or is certain (list + editor + templates all need empty/error/loading). Avoid abstracting the condition row into `shared/` — it is Engagement-specific.

### Shared application (`shared/ui` + `layout`)

| Component | Why shared |
| --- | --- |
| App shell / sidebar / page header | Every route |
| Button (or directive on native button with variants) | Every page |
| Status badge | Rules, templates, future Usage |
| Empty state | List, templates, future lists |
| Error state (inline region + retry) | All async pages |
| Confirmation dialog | Disable, delete (standard vs stronger Active copy), discard |
| Search field | Rules, templates |
| Data table (or a thin wrapper) | Rules list; Usage later |
| Validation message | Editor + any future forms |
| Loading skeleton / region | All async pages |

Do not build a generic “filter bar” framework. A simple toolbar on each page is enough.

### Customer Engagement–specific

| Component | Page |
| --- | --- |
| Metric selector | Editor |
| Operator selector | Editor |
| Condition row | Editor |
| Condition list (combinator + add/remove) | Editor |
| Timing fields | Editor |
| Template picker (select + selected card) | Editor |
| Rule summary card | Editor |
| Template card | Library |
| Template detail panel | Library |
| Human-readable condition text | List column + summary |

A future nested **condition group** component should wrap the condition list; do not build it in v1.

### Do not extract yet

- Page-specific toolbars
- “Smart table” with baked-in Engagement columns
- A generic query builder
- Chart or dashboard widgets

---

## State and forms

- Rule editor: Angular **reactive forms** mapped to `RuleDraft`.
- Validation: domain function subscribed to value changes (real time), not only `statusChanges` on submit.
- Lists: signals from `RuleService.list()`; client-side filter in v1 is acceptable.

No global store library unless a later decision says otherwise.
