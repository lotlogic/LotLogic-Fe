# Handover Checklist

This checklist is based on the deployment workflows, environment contracts, and integrations used by the system.

## 1. Confirm access to connected systems

The solution relies on the following external systems and credentials:

- GitHub Actions access for all three repos
- Azure Storage accounts used by the two frontend deploy workflows
- Azure Container Apps and Azure Container Registry used by the backend deploy workflow
- Production database connection used by the backend deploy workflow
- Stripe API key and webhook secret used by the backend Stripe module
- Google Sheets / Google Apps Script webhook URL and shared secret used by the backend Google Sheets module
- Azure Blob Storage connection string and container used by PDF generation and uploads
- SMTP credentials used by the backend mail module
- Microsoft Entra ID configuration used by the admin frontend and backend invitation flow
- Google Maps / geocoding credentials used by the public assessment flow and backend geo lookup

## 2. Confirm release paths defined in the repos

- `LotLogic-Fe` deploys from `stage` via `.github/workflows/deploy-azure-storage.yml`
- `LotLogic-Be` deploys from `stage` via `.github/workflows/deploy-azure-acr-prod.yml`
- `LotLogic-Free-Assessment` deploys from `main` via `.github/workflows/deploy-azure-storage.yml`

Notes:

- `LotLogic-Fe` still contains legacy AWS deploy scripts in `package.json`, but the active automated deploy path is the Azure Storage workflow.
- `LotLogic-Be` runs database migrations on startup when `AUTO_MIGRATE=true`.

## 3. Confirm critical runtime paths exposed by the backend

These routes matter to handover:

- `GET /api/health`
- `GET /api/geo/act-zone`
- `POST /api/enquiry/get-in-touch`
- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`
- `POST /api/google-sheets/append`
- `POST /api/google-sheets/dashboard-trigger`
- `POST /api/google-sheets/dashboard-delivery`

## 4. Confirm external dependencies that are not stored in the repos

These external operational assets are part of the solution, but are not fully defined here:

- Google Apps Script implementation and Google Sheet structure
- Final production/static-site public URLs
- Support mailbox / support-hours arrangement
- Any formal ticketing, alerting, or on-call process

## 5. Confirm operational details during handover

- No durable job queue is defined for report generation or report delivery.
- No automated smoke tests are defined in the deploy workflows.
- No formal rollback procedure is included here.
- No formal support ownership, SLA, or retainer model is included here.
