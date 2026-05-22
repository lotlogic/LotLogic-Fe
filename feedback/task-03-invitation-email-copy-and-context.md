# Task 03 - Invitation Email Copy And Context

## Priority
P2

## Status
Ready - default copy decisions made; client final copy pending.

## Source Feedback
- Invitation emails are too generic.
- Estate and builder recipients need clear context: who invited them, for what estate, and what action is expected.

## Current Code Anchors
- BE template: `src/templates/admin-invitation-email.pug`
- BE mail assembly: `src/modules/admin/admin-invitations.controller.ts`

## Scope
- Rewrite invitation subject/body for estate and builder journeys.
- Remove unnecessary technical details from recipient-facing copy.
- Ensure CTA and next-step instructions are explicit.

## Decisions Made To Unblock
1. Keep one invitation template with role-specific context blocks.
2. Use clear role-specific subject lines:
   - Estate invite: `You're invited to manage lots in LotCheck`
   - Builder invite: `You're invited to upload plans in LotCheck`
3. Include mandatory context fields in email body:
   - Inviter name
   - Organization name (estate/builder)
   - Why they were invited
   - What to do next after accepting
4. Remove technical/internal details from recipient-facing copy.

## Draft Copy Baseline (Implementation Default)
- Estate body intent: "You have been invited to access LotCheck for [Estate Name] to manage lots, builder approvals, and rule settings."
- Builder body intent: "You have been invited to access LotCheck for [Estate Name] to upload and manage floor plans for matching."
- CTA label: `Accept Invitation`
- Secondary instruction: "After accepting, sign in to continue in your LotCheck portal."

## Existing Context From "Questions back to Mitch"
- Henry asked Mitch to provide copy and confirmed implementation can proceed once copy is supplied (`09:12` and `09:23` notes).
- Mitch responded `will do` for supplying updated copy (`09:48` note).

## Pending Client Input (Non-blocking)
1. Final subject/body wording from Mitch for estate and builder invitations.

## Proposed Acceptance Criteria
- Invitation emails include inviter context and role-specific purpose.
- Estate and builder subject lines are distinct and explicit.
- Builder invite clearly explains expected effort (uploading floor plans).
