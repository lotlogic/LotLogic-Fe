# Payment Confirmations Runbook

## Scope

This runbook covers the paid-report payment path across `LotLogic-Free-Assessment` and `LotLogic-Be`.

## Payment flow

1. `LotLogic-Free-Assessment` calls `POST /api/stripe/create-checkout-session`.
2. `LotLogic-Be` creates a Stripe Checkout Session.
3. Stripe sends webhook events to `POST /api/stripe/webhook`.
4. `LotLogic-Be` extracts metadata from the Stripe event.
5. `LotLogic-Be` forwards the metadata to the Google Sheets webhook.

## Pricing configuration visible in repo

- The backend uses a fixed Stripe price ID in code.
- The assessment frontend presents the paid report as `$299`.
- No environment variable is provided for controlling report pricing.

## Confirmation points

Confirmation points in the payment flow include:

- Stripe event handling in the backend
- backend logs for webhook processing
- Google Sheets append/update integration

The application does not include an internal order-status store.

## Metadata sent through the payment flow

The backend forwards these fields through Stripe metadata and then into Google Sheets:

- `reportId`
- `clientName`
- `clientEmail`
- `clientPhone`
- `address`
- `suburb`
- `blockSizeM2`
- `zone`
- `intention`
- `stripePaymentId`

## Notes

- The backend handles both `checkout.session.completed` and `payment_intent.succeeded`.
- The backend code does not show dedupe logic before forwarding payment metadata to Google Sheets.
- The assessment checkout status page determines `success` / `cancel` / `error` from query params only.
- The backend code does not send a dedicated post-payment confirmation email.
- Payment pricing is not runtime-configurable from environment.

## Available fallback path

The backend also exposes:

- `POST /api/google-sheets/append`

That endpoint forwards a payload directly to the Google Sheets webhook.

## Payment workflow details to confirm during handover

- Agree how payment confirmation should be defined operationally.
- Confirm whether duplicate-row handling is needed for Google Sheets.
- Confirm the refund and customer-communication process outside the application.
