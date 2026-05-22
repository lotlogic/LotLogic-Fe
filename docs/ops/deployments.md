# Deployments Runbook

## Release matrix

| Repo | Trigger | Target | Notes |
| --- | --- | --- | --- |
| `LotLogic-Fe` | Push to `main` or manual workflow dispatch | Azure Storage account `lotcheck` | Public URL: `https://demo.lotcheck.com.au/` |
| `LotLogic-Be` | Push to `main` or manual workflow dispatch | Azure Container App `lotcheck-be` in resource group `Production` | Builds Docker image and updates the running app |
| `LotLogic-Free-Assessment` | Push to `main` or manual workflow dispatch | Azure Storage account `bpassessmentprod` | Public URL: `https://discover.blockplanner.com.au/` |

## `LotLogic-Be` deployment

### Workflow

`.github/workflows/deploy-azure-acr-prod.yml`:

- builds the runtime Docker image from `Dockerfile.runtime`
- pushes tags to `lotcheck.azurecr.io/lotlogic-be`
- generates both `sha-*` and `prod-latest` tags
- updates Azure Container Apps `lotcheck-be`
- sets:
  - `AUTO_MIGRATE=true`
  - `AUTO_SEED=false`
  - `AUTO_SEED_SKIP_IF_DATA=true`
  - `AUTO_IMPORT_ACT_DATA=false`
- optionally sets `DATABASE_URL` from GitHub secret `PROD_DATABASE_URL`

### Credentials and config

- `AZURE_CREDENTIALS`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `PROD_DATABASE_URL`

### Post-deploy checks

- GitHub Actions success state
- backend health endpoint: `GET https://lotcheck-be.wittysky-d6d60dbd.australiasoutheast.azurecontainerapps.io/api/health`

### Rollback

- the workflow creates `sha-*` image tags
- a formal rollback procedure is not included here

## `LotLogic-Fe` deployment

### Workflow

`.github/workflows/deploy-azure-storage.yml`:

- runs on `main`
- writes build-time `.env` values in the workflow itself
- uploads `dist/` to Azure Storage `$web` for account `lotcheck`

Note:

- the backend URL and core Entra settings are embedded directly in the workflow YAML
- `VITE_MAPBOX_TOKEN` and `VITE_MIXPANEL_TOKEN` are injected from GitHub secrets

### Credentials and config

- `AZURE_CREDENTIALS`
- `VITE_MAPBOX_TOKEN`
- `VITE_MIXPANEL_TOKEN`

### Post-deploy checks

- GitHub Actions success state

## `LotLogic-Free-Assessment` deployment

### Workflow

`.github/workflows/deploy-azure-storage.yml`:

- runs on `main`
- writes build-time `.env` values from GitHub secrets
- uploads `dist/` to Azure Storage `$web` for account `bpassessmentprod`

### Credentials and config

- `AZURE_CREDENTIALS`
- `VITE_API_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

### Post-deploy checks

- GitHub Actions success state

## Deployment details to confirm during handover

- No automated smoke tests are defined in the deploy workflows.
- No formal rollback runbook is included here.
- All three repos deploy from `main`.
