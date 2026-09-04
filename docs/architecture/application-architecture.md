# Application Architecture

**Status:** Phase 1 approved, including product decisions (send behaviour, timing, categories, mock statuses, templates, deletion, day values, navigation)  
**Not yet:** Customer Engagement rule-management UI, APIs, email delivery

This document is the overview. Detailed specifications live alongside it:

| Document | Contents |
| --- | --- |
| `navigation-and-routes.md` | Sitemap, routes, application shell, navigation states |
| `customer-engagement-ux.md` | Rules list, rule editor, template library, wireframes |
| `domain-model.md` | Conceptual frontend models |
| `metric-catalog.md` | Extensible metric definitions |
| `frontend-services.md` | Service boundaries, Angular folder structure, UI component inventory |

Product behaviour remains defined in `docs/features/customer-engagement.md`. Where this architecture **refines** that spec for a simpler first UI, the change is called out in [Decisions](#architecture-decisions).

---

## Application purpose

Portal Genie Admin is an internal frontend for Portal Genie staff.

**v1 ships Customer Engagement only:** author, validate, and manage automated communication rules, and browse the communication template catalog.

**Not in v1:** Customer Usage screens, Settings screens, authentication implementation, email sending, Postmark, recipient preview, or backend workflows.

---

## Information architecture

```
Portal Genie Admin
├── Customer Engagement          ← v1
│   ├── Rules
│   ├── Create rule / Edit rule
│   └── Communication templates
├── Customer Usage               ← reserved, not designed
│   ├── Usage dashboard
│   ├── Customer list
│   └── Customer detail
└── Settings                     ← reserved, not designed
```

v1 navigation shows **Customer Engagement** only. Usage and Settings exist as reserved route prefixes and future feature folders so they can be added without restructuring the app. They do not appear in the sidebar until they have approved screens.

Default landing route: **Rules**.

---

## Layered frontend (when Angular exists)

```
Presentation (pages, presentational components)
        ↓
Domain facades (validation, human-readable summaries, draft mapping)
        ↓
Service contracts (RuleService, TemplateService, MetricCatalogService, …)
        ↓
Adapters (mock now → HTTP later)
```

Pages never call HTTP. Shared UI never owns feature rules. Metric types live in a shared domain area so Customer Usage can consume them later without importing Engagement screens.

---

## Rule lifecycle: frontend vs backend

The Angular app **defines** rules. It does not run them.

| Layer | Owner | v1 |
| --- | --- | --- |
| **Rule definition** | Angular frontend | Author, validate, persist rule records (via mock now, API later) |
| **Rule evaluation** | Future backend | Decide which customers qualify, and when a qualifying *occurrence* happens |
| **Communication execution** | Future backend | Deduplicate, honour once-per-occurrence, future cooldowns/frequency/re-entry, write send history |
| **Delivery** | Future backend / Postmark | Send the message |

The Angular application must not:

- Evaluate customer populations or preview recipients
- Schedule backend jobs
- Deduplicate or track send history
- Send email or integrate Postmark

### v1 intended execution behaviour (backend, not UI)

A communication should trigger **once per customer per qualifying rule occurrence**.

Example: if a customer has had no portal sign-in for 14 days, send the re-engagement template **once** for that occurrence. Do not send again on every later evaluation while the same qualifying state remains true.

The frontend does not implement this. Document it so administrators’ mental model matches backend intent. A short helper in the editor is allowed; a frequency control is not.

### Future execution capabilities (not v1 UI)

Architecture must not prevent later support for:

- Repeatable rules
- Cooldown periods
- Frequency limits
- Re-entry into a rule
- Communication history

Do not add editor fields for these in v1. When needed, they belong on the rule execution contract (backend first, UI second).

---

## Proposed Angular source structure

Phase 2 created `layout/`, `shared/ui/` (button, breadcrumb), feature placeholder pages, and routes. `core/domain` and `core/data` wait until rule-management work.

```
src/app/
  layout/                          # shell only
    app-shell
    sidebar
    page-header
  core/
    domain/                        # shared contracts (metrics, templates, status)
    validation/                    # none here — rule validation stays in the feature
    data/                          # abstract services + mock adapters
      mock/
  shared/
    ui/                            # primitives used in more than one feature
      button, badge, empty-state, confirmation-dialog,
      data-table, search-field, validation-message
  features/
    customer-engagement/
      rules/
        rules-list page
      rule-editor/
        editor page, condition row, timing controls, rule summary
      templates/
        template library page
      validation/                  # pure functions
      models/                      # Rule, drafts — feature-specific
    customer-usage/                # reserved empty feature (no screens in v1)
```

Routing modules are unnecessary. Use standalone routes per feature, composed in the app config.

See `frontend-services.md` for service placement and component ownership.

---

## Architecture decisions

### D1 — v1 is Engagement-only in the UI (approved)

**Decision:** Sidebar lists Customer Engagement destinations only. Usage and Settings are reserved in the route table and folder plan. They are **not** shown as “coming soon” or disabled links.

### D2 — Condition *model* is a tree; v1 *UI* is a single group

**Decision:** Domain models include `RuleConditionGroup` with AND/OR and nested children. The first editor UI exposes **one group**: a list of conditions and a single combinator (All/AND or Any/OR). Nested groups are not in the v1 editor.

**Reason:** Phase 1 asked for a simpler first UI while keeping grouped/nested conditions possible later. Adding “Add group” later should not require a model change.

**Relation to the feature spec:** The spec allowed nested groups in v1. This architecture defers nested *UI* only.

### D3 — Eligibility and timing are separate (approved)

**Decision:**

- **Eligibility (conditions)** = who qualifies.
- **Timing** = when the communication should occur:
  - **A.** When eligibility conditions become true, **or**
  - **B.** Relative to a lifecycle date:
    - X days after registration
    - X days before trial expiry
    - X days after trial expiry
    - Other lifecycle anchors added later via the metric catalog (`supportsTimingAnchor`)

Do not duplicate timing offsets as eligibility conditions. Example: “3 days after registration if no logo” = timing 3 days after registration + condition logo uploaded = no.

Duration metrics may still appear in the catalog where they are useful for **behavioural** eligibility (for example days since last portal sign-in ≥ 14). They are not a second copy of lifecycle send-time.

**v1 timing anchors:** `registeredAt` (after only), `trialExpiresAt` (before and after). Further anchors are catalog additions.

### D4 — Derived duration metrics exist in the catalog

**Decision:** The catalog includes both source dates (`registeredAt`) and derived numbers (`daysSinceRegistration`, `daysUntilTrialExpiry`, `daysSinceLastPortalSignIn`). The simple editor binds operators to the metric’s data type.

**Reason:** “Days since registration > 3” is easier than date operators on a raw timestamp. Date metrics remain for “never occurred” (`is_empty`) and future calendar comparisons.

### D5 — Templates are system-provided and read-only (approved)

**Decision (v1):**

- Templates are system-provided.
- Administrators cannot create, edit, activate, or deactivate templates.
- The library is browse-only.
- The rule editor may select an **available** template.

No composer, subject/body editing, Postmark, or send. Future template management may be added later without changing the `CommunicationTemplate` identity fields.

### D6 — One primary save; status is a field

**Decision:** The editor has **Save rule** (disabled while errors exist) and **Cancel**. Active vs disabled is a **status** control on the rule, not a second submit path. Saving an Active rule that is invalid is impossible because Save stays disabled.

**Reason:** Two submit buttons (Save vs Activate) duplicate the status field and confuse which one persists the draft.

### D7 — Mock adapters behind abstract services

**Decision:** `RuleService`, `RuleGroupService`, `TemplateService`, and `MetricCatalogService` are abstract contracts. v1 provides mock adapters. `CustomerUsageService` is specified but not implemented.

**Reason:** Presentation must not change when HTTP is introduced.

### D8 — Once per customer per qualifying occurrence (approved; backend-owned)

**Decision:** Intended v1 business behaviour is **one communication per customer per qualifying rule occurrence**. The same qualifying state must not generate repeats on every backend evaluation.

The editor does **not** expose send-once, repeat, cooldown, frequency, or re-entry controls. Those are future execution capabilities (see [Rule lifecycle](#rule-lifecycle-frontend-vs-backend)).

### D9 — Rule categories are separate from template categories (approved)

**Decision:** Rules use their own extensible catalog (not `CommunicationCategory`):

| Key | Label |
| --- | --- |
| `onboarding` | Onboarding |
| `adoption` | Adoption |
| `engagement` | Engagement |
| `conversion` | Conversion |
| `announcement` | Announcement |
| `other` | Other |

Keep this as frontend catalog data (same pattern as metrics), not literals in templates. **Category is required** before a rule can be saved.

### D15 — Rule groups are journeys, not categories (Phase 4B)

**Decision:** A **Rule Group** is an administrator-facing collection / customer communication journey (Trial & Onboarding, Adoption, Engagement, Announcements). **Rule Category** remains a separate classification of a single rule’s purpose (Onboarding, Adoption, Engagement, Conversion, Announcement, Other).

A rule stores `groupId` and `sequenceOrder`. `sequenceOrder` is **display and organisational ordering only**. It does not mean “rule 2 runs after rule 1”, and it does not affect eligibility, timing, evaluation, or send behaviour. Those remain on the rule definition. The backend must not treat group sequence as an execution graph.

Administrators set `sequenceOrder` in the rule editor by placing the current rule in the **Journey sequence** panel (drag or Move up / Move down). They do not type a position number. Chronological sequence warnings compare lifecycle offsets only when both rules share the same timing anchor; they never block save.

### D16 — Global journey is derived, not a Rule Group (Phase 4E)

**Decision:** `/engagement/rules/journey` combines Trial & Onboarding, Adoption, and Engagement into one planning view. It is **not** a persisted Rule Group and has no `groupId` and no `globalSequenceOrder`. Announcements stay out of this view. Display order is calculated from comparable lifecycle timing. Behavioural rules are shown without inventing a calendar day. Communication clusters (same anchor and offset, active rules only) and sequence conflicts are warnings only. The group-specific editor journey panel is unchanged.

### D10 — Trial and account status values are temporary mock contracts (approved for frontend)

**Decision:** Use the following for mock/catalog enum values until the backend publishes authoritative lists:

- Trial: `in_trial`, `trial_expired`, `not_in_trial`
- Account: `trial`, `active`, `past_due`, `cancelled`, `inactive`

Keep them **centralised** (metric catalog / domain enum source). Presentation components must not hard-code the value lists.

### D11 — Deletion confirmation depends on status (approved)

- **Disabled rule:** standard confirmation.
- **Active rule:** stronger warning that deleting stops future communications associated with the rule.
- Do not require typing the rule name.

### D13 — Duplicate rule names are allowed (approved)

**Decision:** Rule names are human-readable labels, not unique identifiers. Duplicate names are allowed. Do **not** block save for a duplicate name. Persistence ids come from the backend (opaque `id`); mocks may generate client ids until then.

### D14 — Timing offset of 0 days is valid (approved)

**Decision:** Timing day values are integers **≥ 0**. Zero means the lifecycle date itself (0 days after registration = registration date). Negative values are invalid. Before/after is expressed by timing **direction**, never by a negative number.

Values above 365 remain a non-blocking warning (D12).

---

## Assumptions

Working defaults that were not given as product decisions. Easy to change.

| ID | Assumption |
| --- | --- |
| A2 | Duplicating a rule opens the editor with name `"{original} (copy)"` and status **Disabled**. |
| A4 | Default combinator for a new rule is **AND** (all conditions). |
| A5 | The application shell shows compact brand treatment + “Portal Genie Admin”. No current-user menu until auth exists. |

A1, A3, A6, A7, and A8 were promoted to product decisions.

---

## Intentionally deferred

- Customer Usage UI (dashboard, list, detail)
- Settings / admin
- Authentication and authorisation
- Nested condition-group UI
- Recipient / targeting preview
- Email composer, delivery, Postmark
- Administrator template management
- Starter rule recipes
- Audit trail (who last edited)
- Time of day, time zones
- Repeatable rules, cooldowns, frequency limits, re-entry, communication history (execution/backend; not v1 UI)
- Additional action types beyond “send communication”

---

## Resolved product questions

| ID | Resolution |
| --- | --- |
| Q1 | Once per customer per qualifying occurrence. Backend-owned. No v1 frequency UI. |
| Q2 | Eligibility vs timing split approved, including after registration and before/after trial expiry. |
| Q3 | Separate rule category catalog (D9). |
| Q4 | Mock status values approved; treat as temporary; keep centralised. |
| Q5 | System-provided, read-only templates; no admin activate/deactivate. |
| Q6 | Stronger delete copy for Active rules; no type-to-confirm. |
| Q7 | No hard max; warn above 365; invalid days fail validation. |
| Q8 | Usage and Settings hidden; no “coming soon” nav. |
| Q9 | Duplicate rule names allowed. Names are labels, not unique ids. No blocking duplicate-name error. |
| Q10 | Rule category is **required** before save. |
| Q11 | Timing days may be **0**. Negatives invalid. Direction is before/after, not a sign. |
| Q12 | Rule Group is a journey/collection, required on save, and distinct from Rule Category. Sequence order is administrative display only. |

---

## Remaining open questions

None from the Phase 1 architecture review.

---

## Implementation status

Phase 2 (this phase) initialises the Angular workspace, design tokens, application shell, routing, and placeholder pages. A clean reusable G-mark is not in the repository; the sidebar uses a text brand treatment until a transparent logo asset is supplied. Do not implement rule-management functionality until that phase is requested.
