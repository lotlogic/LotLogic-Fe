# LotCheck + BlockPlanner Email Implementation Plan

Date: March 3, 2026

## Goal

Implement invitation and contact email branding so:

- LotCheck emails use LotCheck brand assets and sender `noreply@mail.lotcheck.com.au`.
- BlockPlanner emails use BlockPlanner assets and sender `noreply@mail.blockplanner.com.au`.
- LotCheck invitation journeys match the copy and mockups in this `brand` folder.

## Brand Routing Rules

1. Invitation emails from `/api/admin/invitations` are LotCheck-branded.
2. Contact emails from public forms (`/api/enquiry`, `/api/demo-request`) must use sender/template based on source product (LotCheck vs BlockPlanner).
3. No cross-brand sender or logo mixing is allowed.

## Phase 1: Frontend Updates (this repo)

Status: In progress

1. Admin user invitations should redirect to admin portal.
2. Estate and builder invitations should redirect to dashboard portal.
3. Admin login default redirect should be `/admin`.
4. LotCheck demo/contact failure fallback text should reference LotCheck support.

## Phase 2: Backend Email Work (mail + invitations service)

Status: Pending (backend repo)

1. Set sender mapping:
   - LotCheck: `LotCheck <noreply@mail.lotcheck.com.au>`
   - BlockPlanner: `BlockPlanner <noreply@mail.blockplanner.com.au>`
2. Implement LotCheck invitation template variants:
   - Estate manager first-time invitation
   - Builder invited by estate (with `[Estate Name]`)
   - Builder direct onboarding
3. Confirm dynamic variables are available and required:
   - `[First Name]`
   - `[Estate Name]` for builder-via-estate template
4. Ensure post-accept flow keeps users in portal (`/admin` or `/dashboard`) and never sends them to marketing pages.
5. Apply LotCheck Entra copy updates:
   - Heading/body text from branding brief
   - Help link: `support@lotcheck.com.au`
6. Add product-aware template selection for contact emails so LotCheck and BlockPlanner each use their own brand.

## Phase 3: Mail Infrastructure / Ops

Status: Pending

1. Verify Mailgun identities for both sender addresses.
2. Confirm SPF, DKIM, and DMARC for both domains in Cloudflare.
3. Validate display names and reply-to behavior in major clients (Outlook, Gmail).

## QA and Sign-off

1. Test each invite scenario end-to-end from send to accepted login.
2. Test contact forms for LotCheck and BlockPlanner separately and verify sender/branding.
3. Confirm email rendering on desktop and mobile clients.
4. Capture screenshots and final approval from product/brand stakeholders.
