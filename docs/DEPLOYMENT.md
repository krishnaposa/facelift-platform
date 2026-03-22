# Deployment

This document describes how to deploy **facelift-platform**, with emphasis on production concerns: build order, database migrations, environment variables, and **deploying to Microsoft Azure**.

The production web app is **`apps/web`** (Next.js). The database schema and Prisma migrations live in **`packages/database`**.

---

## 1. Prerequisites

- **Node.js** 24.x (match the version you use locally).
- **PostgreSQL** 14+ (Azure Database for PostgreSQL is supported).
- **pnpm**, **npm**, or **yarn** for installing dependencies (examples below use `npm` from each package directory).

---

## 2. Build overview

1. Install dependencies for the web app and the database package (Prisma CLI is required for migrations).
2. Generate the Prisma client (output is under `apps/web/generated/prisma` per `schema.prisma`).
3. Apply migrations to the target database (`prisma migrate deploy`).
4. Build the Next.js app (`next build`).
5. Run the server (`next start`).

From the repository root, a typical sequence looks like this:

```bash
cd packages/database
npm install
npx prisma generate
# Client is emitted to apps/web/generated/prisma (see prisma/schema.prisma generator.output)

cd ../../apps/web
npm install
npm run build
```

Running `prisma generate` from **`packages/database`** is the source of truth for the generated client path.

Apply migrations **against the production database** (after backups):

```bash
cd packages/database
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Build and start the app:

```bash
cd apps/web
npm run build
npm run start
```

Set `NODE_ENV=production` in production. The app listens on the port provided by the host (e.g. `PORT`); Next.js defaults to `3000` if unset.

---

## 3. Environment variables

Configure these in your hosting provider’s **application settings** (or secrets manager). Values are read at runtime by `apps/web` unless noted.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (include SSL parameters for managed clouds). |
| `SESSION_SECRET` | Yes (production) | Secret for signing session JWT cookies (`apps/web/lib/auth.ts`). Use a long random string. |
| `RESEND_API_KEY` | No | Send transactional email (e.g. bid accepted) via Resend (`apps/web/lib/email.ts`). |
| `EMAIL_FROM` | No | Verified sender address for Resend (e.g. `Facelift <noreply@yourdomain.com>`). |
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI resource endpoint for optional AI features. |
| `AZURE_OPENAI_API_KEY` | No | API key for the same resource. |
| `AZURE_OPENAI_DEPLOYMENT` | No | Deployment name (model deployment) for chat/completions. |
| `UNSPLASH_ACCESS_KEY` | No | Optional Unsplash integration for gallery imagery. |
| `CONTRACTOR_COMPANY_NAME_KEY` | Recommended | 32-byte key (base64 or hex) for encrypting contractor company names at rest. |
| `CONTRACTOR_PEER_LABEL_SALT` | No | Salt for anonymized peer bidder labels (has a default). |

**Cookies:** In production, session cookies use the `secure` flag when `NODE_ENV === 'production'`. Your site must be served over **HTTPS**.

**Prisma / PostgreSQL:** For Azure and most managed Postgres providers, append SSL requirements to `DATABASE_URL`, for example:

`?sslmode=require` (or the provider’s documented query string).

---

## 4. Database migrations and seeding

- **Deploy schema changes** with `prisma migrate deploy` from `packages/database` using the production `DATABASE_URL`.
- **Seeding** (if you use it) is separate: `npm run db:seed` in `packages/database` is typically for development; run seed scripts in production only when intentional.

Always take a **backup** before migrating production data.

---

## 5. Deploying to Azure

This section describes a common, supported pattern: **Azure App Service (Linux)** running the Next.js **Node** server, with **Azure Database for PostgreSQL** and optional **Azure OpenAI** in the same cloud.

### 5.1 Architecture (recommended)

| Azure resource | Role |
|----------------|------|
| **Azure App Service** (Linux, Node 24) | Hosts `apps/web` (`next start` after `next build`). |
| **Azure Database for PostgreSQL – Flexible Server** | Primary `DATABASE_URL` target. |
| **Azure OpenAI** (optional) | Same AI stack as local dev (`AZURE_OPENAI_*` env vars). |
| **Azure Key Vault** (optional) | Store `SESSION_SECRET`, `DATABASE_URL`, API keys; reference from App Service. |

**Note:** **Azure Static Web Apps** is optimized for static front ends and serverless APIs. This app relies on **Next.js server features** (App Router, API routes, server components). Use **App Service**, **Azure Container Apps**, or **AKS**, not SWA alone, unless you adopt a split architecture explicitly.

### 5.2 PostgreSQL (Flexible Server)

1. Create a **Flexible Server** in the same region as App Service when possible (lower latency).
2. Enable **TLS**; require encrypted connections.
3. Create a database and user for the application.
4. Build `DATABASE_URL`:

   `postgresql://USER:PASSWORD@HOSTNAME.postgres.database.azure.com:5432/DATABASE?sslmode=require`

5. Allow App Service to reach the server:
   - **Firewall:** Add App Service **outbound IPs** to the PostgreSQL firewall rules, **or**
   - Use **VNet integration** + private endpoint (recommended for production).

### 5.3 App Service (Linux + Node)

1. Create an **App Service** on **Linux**, runtime stack **Node 24** (match `engines` in `apps/web/package.json`).
2. Set **Application settings** → **General settings**:
   - **Startup Command:** `npm start` (the deployed package is the built `apps/web` tree; `package.json` defines `"start": "next start"`).
   - **SCM_DO_BUILD_DURING_DEPLOYMENT:** `false` when you deploy a **pre-built** artifact from CI (recommended for this repo). That avoids Oryx rebuilding on the server and matches the GitHub Actions workflow.

3. **GitHub Actions (this repository):** The workflow **`.github/workflows/azure-app-service.yml`** runs on pushes to **`main`** (and **workflow_dispatch**). It installs dependencies, runs `prisma generate`, builds Next.js, prunes devDependencies, runs `prisma migrate deploy`, then deploys **`apps/web`** to App Service **`housefacelift`** with **`azure/webapps-deploy`**.

   Configure the following in the GitHub repository:

   | Kind | Name | Purpose |
   |------|------|---------|
   | **Secret** | `AZURE_WEBAPP_PUBLISH_PROFILE` | Contents of the app’s **Get publish profile** download from Azure Portal for **`housefacelift`** (`.PublishSettings` file). |
   | **Secret** | `DATABASE_URL` | Production PostgreSQL URL; used for `prisma generate` (required by `packages/database/prisma.config.ts`), `prisma migrate deploy`, and must match what you set on App Service. |

   In Azure Portal → App Service → **Configuration** → **Application settings**, set the same runtime variables as **Section 3** (`SESSION_SECRET`, `DATABASE_URL`, and so on). The workflow does not push those for you.

4. **Other deployment options:**
   - **Azure DevOps** or manual pipelines: mirror the same steps (generate → build → migrate deploy → zip deploy of `apps/web`).
   - **Oryx** (built-in build from Git): Point App Service at a repo root that builds `apps/web`; configure build and start so the running directory matches **`apps/web`**.

5. **HTTPS:** Enable **TLS** on the default `azurewebsites.net` host or bind a **custom domain** with a managed certificate.

### 5.4 Prisma on App Service

- Run **`prisma migrate deploy`** in CI/CD **before** or **as part of** deployment, using the production `DATABASE_URL`, not from the running app on first boot unless you use a controlled startup script.
- Ensure the **Prisma generate** step completes during **build** so `apps/web/generated/prisma` exists in the deployed artifact.

### 5.5 Azure OpenAI

If you use AI features in production:

1. Create an **Azure OpenAI** resource in a supported region.
2. Deploy a model (e.g. GPT-4o-mini or your chosen chat model) and note the **deployment name**.
3. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT` in App Service settings (or Key Vault references).

Network restrictions on the OpenAI resource must allow calls from App Service (public endpoint or private networking consistent with your security model).

### 5.6 Email (Resend)

Resend is external to Azure. Create an API key in Resend, verify your **sending domain**, set `RESEND_API_KEY` and `EMAIL_FROM` in App Service. No Azure-specific email service is required.

### 5.7 Optional: Container Apps

If you prefer containers, build a **Docker image** that:

- Installs dependencies,
- Runs `prisma generate` and `next build`,
- Starts with `next start`.

Push the image to **Azure Container Registry** and run it on **Azure Container Apps** or **App Service for Containers**, with the same environment variables and database connectivity as above.

### 5.8 Health and operations

- Use **Application Insights** (or similar) for logs and exceptions from Node/Next.
- Scale App Service **instance count** and **SKU** based on CPU/memory and traffic.
- Schedule **PostgreSQL backups** and test restores.

---

## 6. Checklist before go-live

- [ ] `DATABASE_URL` uses TLS and points at production Postgres.
- [ ] `prisma migrate deploy` has been run successfully.
- [ ] `SESSION_SECRET` is set and is not the default from development.
- [ ] HTTPS is enabled; cookies work with `secure` in production.
- [ ] Email domain verified if using Resend for critical notifications.
- [ ] Azure OpenAI keys and deployment name match the Azure portal (if using AI).
- [ ] Contractor encryption key (`CONTRACTOR_COMPANY_NAME_KEY`) is set and backed up securely if already in use with encrypted data.

---

## 7. Related documentation

- **`docs/DESIGN.md`** — Architecture, stack, and where AI is used in the product.
