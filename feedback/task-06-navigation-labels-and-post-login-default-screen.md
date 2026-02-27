# Task 06 - Navigation Labels And Post-Login Default Screen

## Priority
P2

## Status
Ready - naming and default-flow decisions made.

## Source Feedback
- `Design On Lots` tab label is unclear to non-technical users.
- `Design On Lots` section also needs clearer empty-state purpose text.
- `Brand Settings` scope is unclear (platform vs estate vs builder).
- `State Rule Sets` label is acceptable for admins, but should remain admin-only.
- First screen after login appears inconsistent (Dashboard vs Admin Users).

## Current Code Anchors
- FE nav labels: `src/components/admin/AdminNav.tsx`
- FE admin default route: `src/App.tsx` (`/admin` -> `/admin/users`)
- FE login redirect behavior: `src/pages/admin/AdminLoginPage.tsx`
  - Redirect path can come from stored state/session path.
- FE dashboard heading: `src/pages/dashboard/DashboardPage.tsx`

## Scope
- Rename ambiguous navigation items.
- Define deterministic first destination after login per user context.
- Clarify scope in headings/subheadings for settings pages.
- Ensure admin-only navigation and labels are not leaked into estate/builder experiences.

## Decisions Made To Unblock
1. Rename admin nav label `Design On Lots` to `Plan Matches`.
2. Rename admin nav label `Brand Settings` to `Platform Branding`.
3. Add explicit empty-state helper copy in Plan Matches describing purpose.
4. Keep `State Rule Sets` admin-only.
5. Set deterministic post-login default:
   - `ADMIN` -> `/admin/users`
   - non-admin `USER` -> `/dashboard`

## Existing Context From "Questions back to Mitch"
- No direct resolved answer yet.

## Proposed Acceptance Criteria
- Admin nav labels use approved business-facing wording.
- Login destination is deterministic and documented.
- Page headers/subtitles clearly indicate ownership/scope of settings sections.
