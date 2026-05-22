# LotCheck Future Agent Notes

## Scope Context
- Frontend repo: `D:\__BITBUCKET\LotLogic-Fe`
- Backend repo: `D:\__BITBUCKET\LotLogic-Be`
- Source feedback: `feedback/LotCheck - Backend portals feedback.md`
- Task register: `feedback/LotCheck - Feedback Task Summary.md`

## Current Delivery State (2026-02-27)
1. FE invitation redirects are deterministic and path-based (`/admin` and `/dashboard`), with return-to-requested-path behavior for protected routes.
2. Estate lots workflow is DXF-first; manual lot entry is simplified and technical/geometry fields are hidden behind advanced mode.
3. Estate branding UI now includes logo file guidance; unused estate theme color controls were removed.
4. Rule editors now include precedence guidance, architectural review semantics, and clear `Format JSON` success/error feedback.
5. Builder floor plans now support CSV bulk import in FE using existing single-record create/update endpoints (row-level partial success).
6. Builder dashboard now displays approved-estate context (estate/status/effective date/floor plan count context).

## Recommended Execution Order
1. Complete backend sender-branding work (Task 01) once SMTP/domain config is ready.
2. Apply final invitation subject/body copy from client (Task 03).
3. Replace temporary architectural style option list with Mitch's canonical list when provided.
4. Evaluate whether to add backend bulk floor-plan endpoint for scale/performance hardening (optional post-MVP).

## Cross-Repo Coordination Points
- FE invite senders call `adminApi.inviteUser(...)`; BE owns actual invitation + email dispatch.
- FE floor-plan CSV import currently orchestrates many single-record API calls; backend bulk endpoint is optional future optimization.
- Builder dashboard approved-estate panel currently aggregates from existing estate approval endpoints.

## QA Checklist To Reuse
1. Invitation flow from send -> accept -> first authenticated screen (admin, estate, builder).
2. Estate DXF import + manual lot fallback (advanced fields hidden by default).
3. Floor-plan CSV import success + partial-failure handling.
4. Role/scope guard behavior for estate and builder users.
5. Rule editor guidance and `Format JSON` feedback behavior.

## Maintenance Rule
- Treat the summary file as the source of truth for status, blockers, and ownership; update it whenever a task file changes state.
