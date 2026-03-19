# System Overview

## Repos and roles

| Repo | Role in the system | Key integrations |
| --- | --- | --- |
| `LotLogic-Fe` | Main frontend / admin UI | Azure Storage static website, backend API, Entra ID, Mapbox, Mixpanel |
| `LotLogic-Be` | Shared backend and ops engine | PostgreSQL, Stripe, Google Maps, Google Sheets, Azure Blob, SMTP, Entra ID |
| `LotLogic-Free-Assessment` | Public lead-gen and paid-report funnel | Azure Storage static website, backend API, Google Maps, Stripe, Mixpanel |

## High-level flow

```text
Public user
  -> LotLogic-Free-Assessment
  -> LotLogic-Be /api/geo/act-zone
  -> LotLogic-Be /api/stripe/create-checkout-session
  -> Stripe Checkout
  -> Stripe webhook -> LotLogic-Be /api/stripe/webhook
  -> Google Apps Script / Google Sheets append
  -> Analyst reviews and enriches dashboard row
  -> Google Apps Script trigger -> LotLogic-Be /api/google-sheets/dashboard-trigger
  -> PDF render + Azure Blob upload
  -> Google Sheet row updated with Final PDF link
  -> Google Apps Script / operator marks Delivery status
  -> LotLogic-Be /api/google-sheets/dashboard-delivery
  -> SMTP delivery email with PDF attachment
```

## Main operational dependencies

| Dependency | Used for | Notes |
| --- | --- | --- |
| Azure Storage static website | Hosting the two frontend apps | `LotLogic-Fe` and `LotLogic-Free-Assessment` deploy here |
| Azure Container Apps | Backend runtime | `LotLogic-Be` deploy target |
| Azure Container Registry | Backend image storage | Backend workflow pushes `sha-*` and `prod-latest` tags |
| PostgreSQL / PostGIS | Backend data | Needed for geo, admin, and builder workflows |
| Stripe | Checkout and payment events | Source of truth for payment success |
| Google Apps Script / Google Sheets | Payment queue and report-ops queue | Critical external dependency not versioned in these repos |
| Azure Blob Storage | PDF storage and admin uploads | Required for final report links |
| SMTP | Customer and internal emails | Delivery email and enquiry routing depend on it |
| Google Maps | Address lookup / geocoding | Assessment experience and backend geo lookup depend on it |
| Microsoft Entra ID | Admin auth and invitations | Main frontend / admin workflows |
| Mixpanel | Product analytics | Useful for diagnostics, not core to ops |

## Release model

| Repo | Branch that triggers deploy | Workflow |
| --- | --- | --- |
| `LotLogic-Fe` | `stage` | `.github/workflows/deploy-azure-storage.yml` |
| `LotLogic-Be` | `stage` | `.github/workflows/deploy-azure-acr-prod.yml` |
| `LotLogic-Free-Assessment` | `main` | `.github/workflows/deploy-azure-storage.yml` |

## Backend runtime behavior

The backend container entrypoint does the following on start:

- Runs `prisma migrate deploy` when `AUTO_MIGRATE=true`
- Optionally seeds data when `AUTO_SEED=true`
- Optionally imports ACT GeoJSON data when `AUTO_IMPORT_ACT_DATA=true`
- Starts the Nest app on port `3000`

This matters operationally because:

- every deploy can change schema state if migrations are present
- rollback is not only an image rollback if a migration already ran
- startup failures can come from environment or migration issues before the app is healthy

## Health and observability

- Backend health endpoint: `GET /api/health`
- Backend root endpoint also returns the same health payload
- No dedicated queue dashboard exists for report generation or delivery
- No alerting configuration is stored in the repos
- Operational evidence is split across:
  - GitHub Actions
  - Azure Container Apps logs
  - Stripe dashboard
  - Google Sheets
  - Azure Blob Storage
  - SMTP / mailbox logs

## Externally managed components and handover details to confirm

- Google Apps Script logic and the Google Sheet structure are required for the paid-report workflow but are not committed in a deployable form here.
- The final production/static-site URLs are not fully documented here.
- The support mailbox and support-hours model are not enforced anywhere in code.
- A backend-generated post-payment confirmation email is not included in the backend codebase.
