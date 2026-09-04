# Customer Engagement — Feature Specification

**Status:** Approved for documentation; v1 UX and product decisions live in `docs/architecture/`.  
**Module:** Customer Engagement  
**Application:** Portal Genie Admin (frontend only)

This specification defines the first product module. Where architecture documents record later product decisions (send behaviour, timing, rule categories, templates, deletion, day values), those decisions **supersede** conflicting detail in this file.

---

## 1. Purpose

Customer Engagement lets Portal Genie administrators create **automated communication rules** from customer behaviour and lifecycle data.

The eventual runtime (backend, not this repo) will evaluate those rules against customer usage data and send the assigned communication **once per customer per qualifying occurrence**. This frontend project is responsible for **authoring, validating, and managing rule definitions** — not for evaluation, execution, deduplication, send history, or delivery.

Administrators should be able to express rules such as:

> IF the customer is currently in trial  
> AND they registered X days ago  
> AND they have not uploaded a logo  
> THEN send the selected setup/branding communication.

> IF the customer has had no admin sign-ins in the last X days  
> THEN send the selected re-engagement communication.

---

## 2. Goals and non-goals

### Goals (first UI version)

- List, create, edit, duplicate, enable, disable, and delete rules.
- Build conditions with AND, OR, and nested groups.
- Support lifecycle, usage, and relative-date conditions.
- Assign a communication template from a catalog.
- Configure when the communication should fire (on match or relative to a lifecycle date).
- Validate the rule in real time and block invalid saves.
- Keep the condition catalog extensible so new metrics can be added later.

### Non-goals (this project / this version)

- Sending email, SMS, or in-app messages; Postmark; delivery.
- Rule evaluation, population matching, deduplication, send history.
- Recipient targeting preview (“who would receive this today”).
- A full email composer or HTML template editor; administrator template management.
- Customer Usage dashboards, customer lists, or trend charts.
- Authentication/authorisation implementation (abstract only, if a shell requires a current-user contract).
- Database design or API implementation.

---

## 3. Users

Portal Genie internal administrators. They understand customer onboarding and trial, but they are not expected to write queries or code.

Copy, empty states, and validation messages must stay in that language.

---

## 4. Relationship to Customer Usage

Customer Engagement **matches** on usage and lifecycle signals.  
Customer Usage (future) **displays** those same signals.

Shared concept: a customer metric catalog (registration date, trial status, sign-ins, folders, documents, logo uploaded, and later additions).

| Module | Relationship to metrics |
| --- | --- |
| Engagement (this spec) | Conditions that evaluate metrics; rules that trigger communications |
| Usage (future) | Dashboards and customer-level views of the same metrics |

Keep contracts (TypeScript interfaces) in a shared domain place once the app exists. Do not couple the two feature UIs. Do not build Usage screens now. See `docs/features/customer-usage.md`.

---

## 5. Concepts

### Rule

A named, optionally enabled definition: **when** a customer matches a condition tree, **then** assign a communication with timing.

### Condition

A single test against one metric, for example “trial status is In trial” or “days since last admin sign-in is at least 14”.

### Condition group

A list of conditions (or nested groups) combined with **AND** or **OR**.

### Communication template

A pre-built message definition identified by id and name. This app **selects** a template; it does not send it and does not author its body in v1.

### Timing

When, relative to a match, the communication should be requested (immediately, or after a delay of X days). Delivery infrastructure is out of scope.

---

## 6. Customer metrics (condition catalog)

The backend will eventually supply these. The frontend must treat them as a **catalog of field definitions**, not as fields hard-coded only in one template.

Initial catalog (implemented keys; see `docs/architecture/metric-catalog.md` for categories and operators):

| Field key | Label | Type | Notes |
| --- | --- | --- | --- |
| `registeredAt` | Registration date | date | lifecycle timing anchor (after) |
| `daysSinceRegistration` | Days since registration | duration | eligibility |
| `trialStatus` | Trial status | enum | is / is not |
| `trialExpiresAt` | Trial expiry date | date | lifecycle timing anchor (before/after) |
| `daysUntilTrialExpiry` | Days until trial expiry | duration | eligibility |
| `accountStatus` | Account / subscription status | enum | is / is not |
| `logoUploaded` | Company logo | boolean | Branding; whether a logo has been uploaded |
| `lastPortalSignInAt` | Admin sign-in | date | **Admin** sign-in to Portal Genie; `is_empty` only. Key preserved. |
| `daysSinceLastPortalSignIn` | Days since last admin sign-in | duration | Admin inactivity. Key preserved. |
| `portalSignInCount` | Admin sign-in count | number | Admin activity. Key preserved. |
| `hasCreatedFolder` | Folder | boolean | Admin activity |
| `folderCount` | Folder count | number | Admin activity |
| `hasUploadedDocument` | Document | boolean | Admin activity |
| `documentCount` | Document count | number | Admin activity |
| `lastDocumentUploadedAt` | Last document uploaded | date | Admin activity; not a timing anchor |
| `daysSinceLastDocumentUpload` | Days since last document upload | duration | Admin activity recency |
| `accountingSoftwareConnected` | Accounting software | boolean | connected / not connected |
| `hasPortalVisit` | Portal visit | boolean | **Client** portal visit |
| `daysSinceLastPortalVisit` | Days since last portal visit | duration | Client portal recency |
| `portalVisitCount` | Portal visit count | number | Client portal |
| `hasPortalDocumentUpload` | Portal document upload | boolean | Client portal |
| `portalDocumentUploadCount` | Portal document upload count | number | Client portal |
| `lastPortalDocumentUploadedAt` | Last portal document uploaded | date | Client portal; not a timing anchor |
| `daysSinceLastPortalDocumentUpload` | Days since last portal document upload | duration | Client portal recency |
| `hasCreatedScheduledEmailTemplate` | Scheduled email template | boolean | Communications |

The historical names “portal sign-in” referred to the subscriber/admin logging into Portal Genie, not a client using the client portal. Display copy now says **Admin sign-in**. Client portal behaviour uses the separate Portal usage metrics.

The catalog must allow later fields without rewriting the builder (new key, type, operators, labels).

Temporary frontend/mock enum contracts (keep centralised; backend may replace):

- Trial status: `in_trial`, `trial_expired`, `not_in_trial`
- Account status: `trial`, `active`, `past_due`, `cancelled`, `inactive`

Do not invent a database schema for these. Frontend types and mock adapters are enough until APIs exist.

---

## 7. Condition model

Represent conditions as a tree so AND/OR and nesting stay explicit.

Logical shape (conceptual — not a database table):

- A **group** has `combinator: 'and' | 'or'` and a list of **children**.
- A child is either another **group** or a **condition**.
- A **condition** has `field`, `operator`, and `value` (value shape depends on field type).

Required capabilities:

- AND groups
- OR groups
- Multiple conditions
- Nested groups (at least one level; two is enough for v1)
- Relative dates:
  - X days **after** registration
  - X days **before** trial expiry
  - X days **since** last admin sign-in (inactivity)
- Usage thresholds (counts and booleans)

Operators by type (v1):

| Type | Operators |
| --- | --- |
| boolean | `is_true`, `is_false` |
| enum | `is`, `is_not` |
| number | `eq`, `gt`, `gte`, `lt`, `lte`, `between` |
| date | `relative_days_ago`, `relative_days_from_now`, `relative_days_after_field`, `relative_days_before_field`, `is_empty` (never occurred) |

Relative values are positive integers (days). Field-relative operators name the reference field (`registeredAt`, `trialExpiresAt`, `lastPortalSignInAt`).

---

## 8. Actions and templates

v1 supports a single action type: **Send communication** (request a send). The UI assigns:

- Template id (required)
- Timing (required)

Email sending is not implemented. The save payload is a rule definition the backend will honour later.

### Pre-built lifecycle templates

Catalog entries for selection (ids are stable frontend keys until the API exists):

| Id | Name | Typical use |
| --- | --- | --- |
| `welcome-onboarding` | Welcome / onboarding | New registration |
| `setup-reminder` | Setup reminder | Registered but incomplete setup |
| `logo-branding-setup` | Logo / branding setup | No company logo |
| `first-folder-adoption` | First folder adoption | No folders yet |
| `first-document-adoption` | First document adoption | No documents yet |
| `inactivity-reengagement` | Inactivity / re-engagement | No recent sign-ins |
| `trial-expiry-reminder` | Trial expiry reminder | Trial ending soon |
| `trial-expired` | Trial expired | Trial end date passed |
| `feature-announcement` | Feature announcement | Broadcast-style; still rule-gated |
| `product-adoption` | Product adoption | Usage thresholds |
| `customer-milestone` | Customer milestone | Counts / anniversaries |

v1: select from this catalog. Show name, short description, and purpose. Templates are **system-provided and read-only**. Administrators cannot create, edit, activate, or deactivate them.

Optional later (not v1): starter **rule recipes** that pre-fill conditions + template. If added, they must still pass the same validator.

---

## 9. Timing

Eligibility and timing are separate (approved).

| Option | Meaning |
| --- | --- |
| When conditions become true | Request send when eligibility is met |
| Relative to a lifecycle date | X days after registration; X days before trial expiry; X days after trial expiry; further anchors later |

Do not duplicate a timing offset as an eligibility condition. Duration metrics remain available for behavioural rules (for example days since last sign-in).

Day values: no hard maximum. Values above 365 warn only. Negative, non-numeric, and missing required values fail validation.

Do not implement send-time-of-day, time zones, repeat/cooldown/frequency UI, or delivery in this project.

---

## 10. Screens and behaviour

### 10.1 Rule list

Columns: name, status (enabled/disabled), template name, summary of conditions (human-readable), last updated.

Actions:

- Create rule
- Edit (row or name)
- Duplicate
- Enable / disable (inline toggle with confirmation if disabling)
- Delete (confirm: standard if Disabled; stronger warning if Active — see architecture UX)

States: loading, empty (“No engagement rules yet”), error (retry), populated.

Empty state primary action: Create rule.

### 10.2 Rule editor (create and edit)

Sections, in order:

1. **Basics** — name (required), description (optional), **rule** category (**required**; separate from template categories), status.
2. **Conditions** — eligibility builder (v1: one AND/OR group).
3. **Communication** — select a system template (read-only catalog).
4. **Timing** — when conditions become true, or X days before/after a lifecycle date.
5. **Validation** — live list of errors and warnings.

Duplicate: open editor with a copy, name suffixed with “ (copy)”, **disabled** until the administrator enables it.

Cancel discards unsaved changes (confirm if dirty). Save is disabled while errors exist.

### 10.3 Human-readable summary

Always keep a plain-language preview of the rule, for example:

> When **trial status is In trial** and **days since registration is at least 3** and **logo uploaded is No**, send **Logo / branding setup** immediately.

Update this summary as the administrator edits (same trigger as validation).

Recipient counts and sample customers are **not** in v1.

---

## 11. Real-time validation

Validate on every change to name, tree, template, or timing — not only on submit.

### Errors (block save)

- Name missing or only whitespace.
- No conditions (empty root group).
- Any group with fewer than one complete child.
- Incomplete condition (missing field, operator, or required value).
- Relative/count values that are not positive integers where required (or negative / non-numeric).
- `between` with missing or inverted bounds.
- No template selected.
- Timing delay selected without a valid day count.
- Direct contradictions in the same AND group, including:
  - trial `in_trial` together with `trial_expired`
  - boolean true and false on the same field
  - mutually exclusive account statuses with AND

### Warnings (allow save, must be visible)

- Day values greater than 365 (no hard maximum; does not block save).
- OR group that is logically always true (if detectable cheaply).
- Template that is an unusual match for the conditions (optional heuristic; do not block).

Show errors next to the offending control **and** in the validation panel. Focus the first error on attempted save.

Do not call a backend validator in v1; keep validation a pure frontend domain function so it can later wrap or complement an API.

---

## 12. Frontend architecture (no backend)

When the Angular app is created, keep this shape:

```
features/customer-engagement/
  pages/                 # list + editor routes
  components/            # condition builder, rule summary, template picker
  models/                # Rule, ConditionGroup, catalog types
  validation/            # pure functions, unit-testable
  data/                  # repository interface + mock adapter
```

Shared (not feature-owned) later:

- Metric catalog types used by Engagement now and Usage later.
- Communication template catalog types.

Repository interface (illustrative):

- `listRules()`, `getRule(id)`, `saveRule(draft)`, `deleteRule(id)`, `setEnabled(id, enabled)`
- `listTemplates()`

Mock adapter holds in-memory/fixture data. Components never import fixture arrays directly.

Do not specify SQL tables, document collections, or provider webhooks.

---

## 13. Extensibility

Expect additions without redesigning the module:

- New metrics in the catalog.
- New operators for existing types.
- Additional communication types (not only email) via action type.
- Optional recipient preview (Usage + Engagement together) — explicitly **not** v1.
- Starter recipes.
- Repeatable rules, cooldowns, frequency limits, re-entry, and communication history (backend execution; not v1 UI).

The condition builder must be driven by the catalog. Adding a field should be a catalog change plus mock data, not a new one-off form.

---

## 14. Acceptance criteria (UI, when built)

- Administrator can create a rule with AND and OR conditions, save it, see it in the list, edit it, duplicate it, disable it, enable it, and delete it.
- Relative “X days after registration”, “X days before trial expiry”, and “X days after trial expiry” are expressible as **timing**.
- Inactivity “no sign-ins in last X days” is expressible as **eligibility**.
- Logo / folder / document booleans and counts are expressible.
- A template is required before save.
- Validation messages update as the rule changes; save stays disabled while errors remain.
- Loading, empty, and error states exist on the list.
- No email is sent from the application.
- No Customer Usage screens are introduced as part of this module.

---

## 15. Open points

Product decisions from architecture review are recorded in `docs/architecture/application-architecture.md` (Q1–Q11 resolved).

Deferred: nested group UI, audit trail, auth, Usage/Settings screens.
