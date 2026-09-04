# Domain Model (frontend, conceptual)

**Status:** Phase 1 blueprint  
**Not a database schema.** These are TypeScript-shaped contracts the UI and services will share.

Identifiers are opaque strings (`id`). Dates on persisted rules (`updatedAt`, `createdAt`) are ISO-8601 strings in the frontend model.

Extensibility rule: **new metrics and operators are catalog data**, not new rule shapes.

---

## Enumerations and unions

### MetricType

| Value | Meaning |
| --- | --- |
| `boolean` | Yes / no |
| `enum` | One of a closed list |
| `number` | Integer or decimal count |
| `duration_days` | Integer day count derived from a date |
| `date` | Calendar or timestamp metric |

### MetricOperator

Not every operator applies to every type. The catalog lists the allowed set per metric.

| Operator | Typical types | Value required |
| --- | --- | --- |
| `is_true` | boolean | No |
| `is_false` | boolean | No |
| `is` | enum | Yes (enum value) |
| `is_not` | enum | Yes |
| `eq` | number, duration_days | Yes |
| `gt` | number, duration_days | Yes |
| `gte` | number, duration_days | Yes |
| `lt` | number, duration_days | Yes |
| `lte` | number, duration_days | Yes |
| `between` | number, duration_days | Yes (min and max) |
| `is_empty` | date | No (never occurred / not set) |

Do not add `relative_days_after_field` as a v1 **operator** on dates. Relative offsets are either:

- a `duration_days` metric in **conditions**, or
- a timing mode in **RuleTiming**.

That keeps the condition row to metric + operator + value.

### LogicalOperator

`and` | `or`

### RuleStatus

`active` | `disabled`

There is no stored `draft` status. Unsaved work exists only in the editor.

### RuleCategory

**Separate from `CommunicationCategory`.** Extensible catalog data (not literals in components).

| Key | Label |
| --- | --- |
| `onboarding` | Onboarding |
| `adoption` | Adoption |
| `engagement` | Engagement |
| `conversion` | Conversion |
| `announcement` | Announcement |
| `other` | Other |

Adding a category later is a catalog change, same pattern as metrics. Keys may coincide with template category keys (for example `onboarding`); they are **different types** and must not be mixed.

### CommunicationCategory

| Key | Label |
| --- | --- |
| `welcome` | Welcome |
| `onboarding` | Onboarding |
| `setup` | Setup |
| `branding` | Branding / logo adoption |
| `folder_adoption` | Folder adoption |
| `document_adoption` | Document adoption |
| `inactivity` | Inactivity / re-engagement |
| `trial_reminder` | Trial reminders |
| `trial_expiry` | Trial expiry |
| `announcement` | Product / feature announcements |
| `milestone` | Customer milestones |

### MetricCategory

`lifecycle` | `branding` | `activity` | `content`

### RuleTimingMode

`on_match` | `days_after_date` | `days_before_date`

---

## CustomerMetric

A catalog entry, not a customer’s live values.

| Field | Meaning |
| --- | --- |
| `key` | Stable id, e.g. `logoUploaded` |
| `displayName` | Administrator label |
| `category` | `MetricCategory` |
| `type` | `MetricType` |
| `operators` | Allowed `MetricOperator[]` |
| `valueRequired` | Whether a condition value is required (false for `is_true` / `is_false` / `is_empty`) |
| `enumValues?` | For `enum`: `{ value, label }[]` |
| `supportsTimingAnchor` | If true, this metric may be chosen in Timing after/before |
| `timingDirections?` | `after` / `before` / both — only if timing anchor |

**v1 timing anchors:** `registeredAt` after; `trialExpiresAt` after and before. Other anchors are later catalog additions.

Customer **readings** (a customer’s logoUploaded = false) are Usage data. They are not part of the Engagement authoring model in v1.

---

## RuleCondition

A single test.

| Field | Meaning |
| --- | --- |
| `id` | Client-generated id for list rendering |
| `metricKey` | Catalog key |
| `operator` | Must be allowed for that metric |
| `value` | Discriminated by metric type (see below) |

### Condition value shapes

| Metric type | `value` |
| --- | --- |
| boolean | `null` (operator carries true/false) |
| enum | `string` |
| number / duration_days | `number` or `{ min, max }` for `between` |
| date + `is_empty` | `null` |

Invalid combinations are caught by validation, not by extra model types.

---

## RuleConditionGroup

| Field | Meaning |
| --- | --- |
| `id` | Client-generated id |
| `combinator` | `LogicalOperator` |
| `children` | Array of `RuleConditionGroup | RuleCondition` |

v1 editor always writes **one group** whose children are **only conditions** (no nested groups). Nested groups remain valid in the type so a later UI can emit them.

A condition row is never stored as a loose array on `Rule` without a root group.

---

## RuleTiming

| Field | Meaning |
| --- | --- |
| `mode` | `RuleTimingMode` |
| `delayDays?` | Required when mode is `days_after_date` or `days_before_date`; integer ≥ 0 (0 = the anchor date) |
| `anchorMetricKey?` | A metric with `supportsTimingAnchor` |

`on_match` has no delay and no anchor.

---

## CommunicationTemplate

| Field | Meaning |
| --- | --- |
| `id` | Stable key, e.g. `logo-branding-setup` |
| `name` | Display name |
| `category` | `CommunicationCategory` |
| `purpose` | Short explanation |
| `lifecycleStage` | Plain-language stage (e.g. “During trial, setup incomplete”) |
| `available` | Whether the editor may select it. v1: always true for shipped templates; not admin-editable |

No subject, HTML body, or provider id in v1. Those belong to a future delivery contract. Template **management** (create/edit/activate) is a future UI; keep the model free of admin-only write fields until then.

### Initial catalog (ids unchanged from the feature spec)

| Id | Name | Category | Lifecycle stage (proposed copy) |
| --- | --- | --- | --- |
| `welcome-onboarding` | Welcome / onboarding | `welcome` | Newly registered |
| `setup-reminder` | Setup reminder | `setup` | Registered, setup incomplete |
| `logo-branding-setup` | Logo / branding setup | `branding` | Trial or active, no logo |
| `first-folder-adoption` | First folder adoption | `folder_adoption` | No folders yet |
| `first-document-adoption` | First document adoption | `document_adoption` | No documents yet |
| `inactivity-reengagement` | Inactivity / re-engagement | `inactivity` | Quiet after previous activity |
| `trial-expiry-reminder` | Trial expiry reminder | `trial_reminder` | Trial ending soon |
| `trial-expired` | Trial expired | `trial_expiry` | Trial end date passed |
| `feature-announcement` | Feature announcement | `announcement` | Any eligible segment |
| `product-adoption` | Product adoption | `announcement` | Usage threshold |
| `customer-milestone` | Customer milestone | `milestone` | Anniversary or count milestone |

Welcome vs onboarding: `welcome-onboarding` is listed under **Welcome**. If product wants a distinct onboarding template later, add a catalog row; do not split this id without a decision.

---

## Rule

Persisted (or mock-persisted) engagement rule.

| Field | Meaning |
| --- | --- |
| `id` | Opaque |
| `name` | Required |
| `description` | Optional |
| `category` | Required `RuleCategory` (not a template category) |
| `status` | `RuleStatus` |
| `rootGroup` | `RuleConditionGroup` |
| `templateId` | Communication template id |
| `timing` | `RuleTiming` |
| `createdAt` | ISO string |
| `updatedAt` | ISO string |

### RuleDraft

Editor state: same fields except `id` / timestamps optional. Create has no `id` until save.

v1 does **not** include send-policy, cooldown, frequency, re-entry, or history on `Rule`. Those are future execution-contract fields. Intended backend behaviour without a UI field: once per customer per qualifying occurrence.

---

## ValidationResult

| Field | Meaning |
| --- | --- |
| `errors` | `ValidationIssue[]` — block save |
| `warnings` | `ValidationIssue[]` — do not block save |
| `isValid` | `errors.length === 0` |

### ValidationIssue

| Field | Meaning |
| --- | --- |
| `code` | Stable machine code, e.g. `rule.name.required` |
| `message` | Administrator-facing sentence |
| `path` | Pointer for inline highlight, e.g. `name`, `rootGroup.children.2.value`, `timing.delayDays`, `templateId` |
| `severity` | `error` | `warning` |

Validation is a **pure function** of `RuleDraft` + catalogs. Duplicate names are allowed; do not treat name as unique. No HTTP in v1.

---

## Human-readable summary

Not stored. Derived from `RuleDraft` + catalogs for the list column and the editor summary card.

---

## Shared vs feature-owned

| Concept | Lives with |
| --- | --- |
| `CustomerMetric`, `MetricType`, `MetricOperator`, `MetricCategory` | Shared domain (`core/domain`) — Usage will reuse |
| Trial/account **enum values** | Centralised with the metric catalog (temporary mock contract). Not copied into components |
| `RuleCategory` | Centralised catalog in shared or engagement domain |
| `CommunicationTemplate`, `CommunicationCategory` | Shared domain — catalog is a system resource |
| `Rule`, `RuleCondition`, `RuleConditionGroup`, `RuleTiming`, `RuleStatus`, `ValidationResult` | Customer Engagement feature models |

Do not put Usage dashboard view-models in this file. When Usage is designed, it may add `CustomerUsageSummary` alongside the metric keys, not inside `Rule`.
