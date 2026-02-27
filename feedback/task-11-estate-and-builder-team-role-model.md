# Task 11 - Estate And Builder Team Role Model

## Priority
P2

## Status
Resolved for current phase - de-scoped from MVP.

## Source Feedback
- Estate team members are all `USER` with no intra-organization role differentiation.
- Client requested at least one org-level admin role for primary contacts.

## Current Code Anchors
- FE estate team management: `src/pages/dashboard/DashboardEstatePage.tsx`
- FE builder team management: `src/pages/dashboard/DashboardBuilderPage.tsx`
- Invite payloads currently set role to `USER`.
- BE invitations:
  - `src/modules/admin/admin-invitations.controller.ts`
  - Global role model currently `ADMIN` vs `USER`.

## Scope
- Decide whether to introduce organization-scoped roles (for example estate admin / builder admin).
- Update invite/member management flows if role levels are added.
- Define permission boundaries for invite/remove/manage actions.

## Decision Made To Unblock
1. Keep current global role model (`ADMIN` and `USER`) for MVP.
2. Do not introduce estate-specific or builder-specific sub-roles in this release.
3. Capture org-level role differentiation as a post-MVP enhancement task.

## Existing Context From "Questions back to Mitch"
- Henry noted current model is `ADMIN` for system admins and `USER` for everyone else, and asked whether adding intra-org roles is desired.
- Mitch confirmed this is not a priority now and should be considered for a future phase.

## Proposed Acceptance Criteria
- Role model decision is explicitly documented as out-of-scope for MVP.
- Current invite/member behavior remains stable with no partial role-model changes.
