# Customer Usage — Future Module (not in scope)

**Status:** Documented only. Do not design screens or implement this module yet.  
**Depends on:** Shared customer metric contracts used by Customer Engagement.

---

## Purpose

Customer Usage will let Portal Genie administrators **monitor adoption** and spot customers who may need engagement.

Where Customer Engagement **acts** on metrics (rules and communications), Customer Usage **shows** those metrics.

---

## Intended capabilities (later)

- Overall usage dashboard
- Customer list
- Customer-level usage detail
- Engagement and activity metrics
- Adoption metrics (logo, folders, documents, sign-ins)
- Trial and account status
- Last activity
- Usage trends over time

The aim is operational: who is adopting the portal, who is stalling in trial, and who has gone quiet.

---

## Relationship to Customer Engagement

- Both modules read the same metric catalog (see `docs/features/customer-engagement.md` §6).
- Usage may later deep-link into creating a rule (“customers with no logo”) — that is a future integration, not a v1 requirement.
- Engagement must not wait on Usage UI. Rules are authored against the catalog, not against dashboard widgets.
- Keep the modules separate in the folder structure. Share types, not pages.

---

## Out of scope until requested

- Information architecture, wireframes, or visual design for dashboards
- Charts, tables, or customer search
- Backend analytics pipelines
- Combining Usage preview with Engagement recipient counts

When this module is scheduled, start with a dedicated feature specification and only then design UI.
