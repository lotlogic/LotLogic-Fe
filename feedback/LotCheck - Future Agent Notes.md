# LotCheck Future Agent Notes

## Scope Context
- Frontend repo: `D:\__BITBUCKET\LotLogic-Fe`
- Backend repo: `D:\__BITBUCKET\LotLogic-Be`
- Source feedback: `feedback/LotCheck - Backend portals feedback.md`
- Task register: `feedback/LotCheck - Feedback Task Summary.md`

## High-Signal Findings From Code Review
1. FE invitation redirects are now deterministic and path-based (`/admin` or `/dashboard`) and no longer rely on invite redirect env vars.
2. Backend invite emails are assembled in `admin-invitations.controller.ts` and are treated as LotCheck-only, because Free Assessment traffic does not hit admin invitation endpoints.
3. Estate bulk lot ingestion via DXF already exists (`POST /admin/estates/:id/lots/import-dxf`), including derived geometry and side-length handling.
4. Builder floor plan bulk ingestion does not currently exist; floor plan API is single-record CRUD.
5. Raw ISO datetimes are rendered directly in at least state-rule and builder-approval tables.
6. Admin login flow now includes branded page-level context/copy before secure sign-in handoff.

## Recommended Execution Order
1. Execute P1 implementation tasks first (sender, redirect, lot import simplification, floor-plan bulk upload).
2. Implement invitation flow fixes and default copy together so UAT can validate end-to-end invites early.
3. Implement agreed data contracts for CSV and controlled vocab before polishing UI text.
4. Apply global formatting/label cleanup (timestamps, labels, notes copy) as a finishing pass.

## Cross-Repo Coordination Points
- FE invite senders call `adminApi.inviteUser(...)`; BE owns actual invitation + email dispatch.
- FE lot/floor-plan forms may need new BE bulk endpoints and validation responses.
- Builder dashboard estate context likely needs a builder-centric approvals endpoint or expanded builder detail payload.

## QA Checklist To Reuse
1. Invitation flow from send -> accept -> first authenticated screen (admin, estate, builder).
2. Bulk import success + partial-failure handling (lots and floor plans).
3. Recompute triggers and performance impact after imports.
4. Role/scope guard behavior for estate and builder users.
5. Date/time rendering consistency across all admin/dashboard tables.

## Maintenance Rule
- Treat the summary file as the source of truth for status, blockers, and ownership; update it whenever a task file changes state.
