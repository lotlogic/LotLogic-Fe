# Task 02 - Invitation Redirect And Login Destination

## Priority
P1

## Status
Implemented (FE) - fixed-path redirects now in code, pending end-to-end validation.

## Source Feedback
- After accepting invitations, users were redirected to marketing/mockup pages instead of the portal login/portal.

## Current Code Anchors
- FE:
  - `src/pages/admin/AdminUsersPage.tsx`
  - `src/pages/admin/AdminEstatePage.tsx`
  - `src/pages/admin/AdminBuilderPage.tsx`
  - `src/pages/dashboard/DashboardEstatePage.tsx`
  - `src/pages/dashboard/DashboardBuilderPage.tsx`
  - Invitation redirects now use fixed app paths on current origin (`/admin` or `/dashboard`) without invite redirect env vars.
  - `src/pages/admin/AdminLoginPage.tsx` defaults post-login destination to `/admin`.
- BE:
  - `src/modules/admin/admin-invitations.controller.ts` requires `redirectUrl` and forwards it to Entra invitations.

## Scope
- Stop using marketing-site root as redirect fallback.
- Set deterministic redirect paths for all invite senders.
- Ensure attempted `/admin` access returns to `/admin` after authentication.
- Verify post-accept flow lands in the expected authenticated route.

## Decisions Made To Unblock
1. Use fixed, in-app invite redirects built from current origin.
2. Admin user invitations from `AdminUsersPage` redirect to `/admin`.
3. Estate/builder invitations redirect to `/dashboard`.
4. Remove invite redirect env-var dependency from frontend invite flows.
5. Default admin login redirect path is `/admin` so direct admin login lands in admin portal flow.

## Existing Context From "Questions back to Mitch"
- No direct answer captured yet; issue reproduced in client testing.

## Proposed Acceptance Criteria
- Admin-user invitations land on `/admin`; estate/builder invitations land on `/dashboard`.
- No frontend invitation flow relies on invite redirect env vars.
- Attempting `/admin` before auth returns the user to `/admin` after sign-in.
- End-to-end test pass for admin, estate, and builder invitation flows.
