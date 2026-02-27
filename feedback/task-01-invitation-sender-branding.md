# Task 01 - Invitation Sender Branding

## Priority
P1

## Status
Ready - backend aligned, no dual-domain SMTP setup required for this task.

## Source Feedback
- Invitation emails currently show `BlockPlanner` / `mail.blockplanner.com.au`.
- Client requested all invites to be clearly branded as LotCheck.
- Review completed: Free Assessment (`blockplanner.com.au`) does not call invitation endpoints.

## Current Code Anchors
- FE: invites triggered from `adminApi.inviteUser(...)` across admin/dashboard pages.
- BE: `src/modules/admin/admin-invitations.controller.ts` invitation flow now uses LotCheck branding for admin invites.
- BE: `src/modules/mail/mail.service.ts` now supports explicit `from` override and no longer has `BlockPlanner` hardcoded fallback in `sendEmailOrThrow`.
- BE template: `src/templates/admin-invitation-email.pug`.
- Free Assessment app endpoints (separate repo): `GET /api/geo/act-zone`, `POST /api/stripe/create-checkout-session`.

## Scope
- Ensure invitation emails from admin invite flow are LotCheck-branded.
- Remove hardcoded BlockPlanner fallback from invite email sender logic.
- Keep this task limited to invitation flow endpoints.

## Decisions Made To Unblock
1. Admin invitation endpoint is treated as LotCheck-only.
2. Free Assessment traffic does not use `/api/admin/invitations`, so it does not drive sender identity for Task 01.
3. Invitation sender uses `SMTP_FROM` + `SMTP_FROM_NAME` with LotCheck fallback name.
4. Keep this task scoped to invitation emails only; broader mail-template rebrand is separate.

## Existing Context From "Questions back to Mitch"
- Henry asked Mitch to confirm desired sender value (`09:11` note).
- Mitch responded `Will do` (`10:01` note) and the thread item was marked resolved.
- Until an explicit alternate sender is supplied, keep LotCheck sender defaults.

## Remaining External Dependency (Henry/Ops)
1. Ensure standard SMTP config (`SMTP_FROM`, optional `SMTP_FROM_NAME`) is set for LotCheck invite sending.

## Proposed Acceptance Criteria
- Admin invites send from LotCheck identity.
- No invitation path relies on hardcoded sender-brand fallbacks.
- Sender configuration is documented in `.env` setup notes.
