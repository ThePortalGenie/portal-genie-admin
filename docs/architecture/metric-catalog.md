# Metric Catalog Architecture

**Status:** Phase 1 blueprint — **do not implement the catalog in code yet**

The catalog is the single description of what administrators can test in a rule. The condition builder is driven by this data. Adding a metric later should be a catalog (and mock) change, not a new form.

Customer Usage will later **display** the same keys. It must not own a second incompatible list.

Live customer values are not part of this catalog. This file defines **definitions**, not readings.

---

## Design rules

1. Every condition `metricKey` must exist in the catalog.
2. The editor offers only that metric’s `operators`.
3. `valueRequired` plus operator determines whether a value control is shown.
4. Timing after/before uses metrics with `supportsTimingAnchor`.
5. Prefer a **derived `duration_days` metric** for “days since / until” rather than complex date operators in v1.

---

## Operator sets (by type)

| Type | Operators | Value required |
| --- | --- | --- |
| `boolean` | `is_true`, `is_false` | No |
| `enum` | `is`, `is_not` | Yes |
| `number` | `eq`, `gt`, `gte`, `lt`, `lte`, `between` | Yes |
| `duration_days` | same as number | Yes (integer days) |
| `date` | `is_empty` only in v1 | No |

Calendar comparisons (“registered before 1 Jan”) are deferred. v1 date metrics exist so “never signed in” is expressible via `lastPortalSignInAt` + `is_empty`.

---

## Enumerations (temporary frontend / mock contracts)

**These values are approved for frontend development only.** The backend team may later supply the authoritative lists. Define them **once** (metric catalog / domain source). Condition pickers, summaries, and validators must read from that source — do not scatter string literals through presentation components.

**Trial status** (`trialStatus`)

| Value | Label |
| --- | --- |
| `in_trial` | In trial |
| `trial_expired` | Trial expired |
| `not_in_trial` | Not in trial |

**Account / subscription status** (`accountStatus`)

| Value | Label |
| --- | --- |
| `trial` | Trial |
| `active` | Active |
| `past_due` | Past due |
| `cancelled` | Cancelled |
| `inactive` | Inactive |

---

## Initial catalog

### Lifecycle

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `registeredAt` | Registration date | `date` | `is_empty` | No | After (not before) |
| `daysSinceRegistration` | Days since registration | `duration_days` | number set | Yes | No — use timing “days after registration” for send time |
| `trialStatus` | Trial status | `enum` | `is`, `is_not` | Yes | No |
| `trialExpiresAt` | Trial expiry date | `date` | `is_empty` | No | After and before |
| `daysUntilTrialExpiry` | Days until trial expiry | `duration_days` | number set | Yes | No — eligibility only. Send-time uses timing before/after `trialExpiresAt` |
| `accountStatus` | Account / subscription status | `enum` | `is`, `is_not` | Yes | No |

Notes:

- `registeredAt` + `is_empty` is unlikely in production (every customer has a registration). Include for catalog completeness; the editor may still show it. Optional product choice: hide metrics flagged `hiddenInBuilder` later — **not in v1**.
- **Days until trial expiry** is eligibility (“fewer than 7 days left”). **Timing** “7 days before trial expiry” or “3 days after trial expiry” is when to send. Do not require both.

### Branding

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `logoUploaded` | Logo uploaded | `boolean` | `is_true`, `is_false` | No | No |

### Activity

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `lastPortalSignInAt` | Last portal sign-in | `date` | `is_empty` | No | **No in v1** (eligibility only; future timing anchor if added to the catalog) |
| `daysSinceLastPortalSignIn` | Days since last portal sign-in | `duration_days` | number set | Yes | No |
| `portalSignInCount` | Portal sign-in count | `number` | number set | Yes | No |

Inactivity: prefer `daysSinceLastPortalSignIn` `gte` X. Never signed in: `lastPortalSignInAt` `is_empty` (optionally OR with count `eq` 0 — contradictory if AND’d with “days since last sign-in”; validator should warn or error when mixing empty last sign-in with days-since-last-sign-in).

### Content

| Key | Display name | Type | Operators | Value required | Timing anchor |
| --- | --- | --- | --- | --- | --- |
| `folderCount` | Folder count | `number` | number set | Yes | No |
| `hasCreatedFolder` | Has created a folder | `boolean` | `is_true`, `is_false` | No | No |
| `documentCount` | Document count | `number` | number set | Yes | No |
| `hasUploadedDocument` | Has uploaded a document | `boolean` | `is_true`, `is_false` | No | No |

`hasCreatedFolder` is equivalent to `folderCount` `gt` 0. Both exist because administrators think in yes/no for adoption and in counts for milestones. Validation may **warn** if both are used in the same AND group in a redundant way; it should **error** if they contradict (has created folder = yes AND folder count = 0).

---

## Timing anchors (v1)

| Metric | After | Before |
| --- | --- | --- |
| `registeredAt` | Yes | No |
| `trialExpiresAt` | Yes (X days after trial expiry) | Yes (X days before trial expiry) |

`lastPortalSignInAt` is **not** a v1 timing anchor. Inactivity is expressed as eligibility (`daysSinceLastPortalSignIn`). Further anchors are catalog additions.

---

## Adding a metric later

1. Add a `CustomerMetric` row (key, names, type, operators, flags).
2. If enum, add values.
3. Extend mock customer data only when Usage exists.
4. Do not change `RuleCondition` shape.

No backend schema is defined here.

---

## What the catalog is not

- Not a query language
- Not customer records
- Not analytics measures with time grains (Usage may add those later as a different concept)
