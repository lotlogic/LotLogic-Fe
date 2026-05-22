# Task 14 - Admin Login Branding Experience

## Priority
P2

## Status
Implemented (FE) - branded `/admin/login` experience delivered, pending UAT polish.

## Source Feedback
- Microsoft authentication works, but first-touch login experience feels generic.
- Client requested LotCheck-branded entry experience before MS auth handoff.

## Current Code Anchors
- FE login page: `src/pages/admin/AdminLoginPage.tsx`
- FE auth config/redirect flow: `src/lib/auth/adminAuth.ts`

## Scope
- Define branded login entry flow that still uses Entra authentication securely.
- Align login URL/visual presentation with LotCheck identity where feasible.
- Ensure this change does not break role-aware redirects and session handling.

## Decisions Made To Unblock
1. Keep and enhance the existing LotCheck pre-auth page (`/admin/login`) as the primary branded entry.
2. Apply Entra tenant branding in parallel for the hosted auth screens.
3. Do not require custom auth domain/URL changes for MVP.
4. Use current LotCheck styling/assets already in repo; final visual polish can iterate without blocking.

## Existing Context From "Questions back to Mitch"
- Client requested branding and clearer pre-auth context copy on `/admin/login`; implemented in FE.

## Proposed Acceptance Criteria
- Login entry experience is visibly LotCheck-branded.
- Auth still delegates to Entra with no security regressions.
- Redirect and session behavior remain consistent with approved portal flow.
