This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Microsoft AI (Azure OpenAI) – automatic project gallery

The app uses **Azure OpenAI** (Microsoft AI) to improve **automatic gallery pull** for projects. Gallery images are matched to a project’s **catalog items** (e.g. front door, bidets, cabinet refacing); when Azure OpenAI is configured, the project’s title and description are used to derive **style tags** and gallery results are reordered to favor matching styles.

### How it works

- **Project detail** (`/projects/[id]`) and **Edit project** (`/projects/[id]/edit`) load gallery images from the database whose `catalogItemId` matches one of the project’s selected upgrades.
- **Optional AI**: If `AZURE_OPENAI_*` env vars are set, the app calls Azure OpenAI with the project title, description, and catalog item names to get 3–5 style keywords. Gallery images with a matching `styleTag` are sorted to the top.

### Setup

1. **Create an Azure OpenAI resource** in the [Azure Portal](https://portal.azure.com) (Cognitive Services → Azure OpenAI). Deploy a chat model (e.g. gpt-4o, gpt-4o-mini).

2. **Add environment variables** in `apps/web/.env.local` (optional; gallery still works without them, using only catalog-item match):

   ```env
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
   AZURE_OPENAI_API_KEY=<your-api-key>
   AZURE_OPENAI_DEPLOYMENT=<deployment-name>
   ```

3. **Gallery data**: Ensure `GalleryImage` rows exist and are linked to `CatalogItem` via `catalogItemId`. Set `styleTag` (e.g. `modern`, `traditional`) for better AI-based ordering when Azure OpenAI is configured.

4. **Auto-seed when gallery is empty**: If the `GalleryImage` table is empty, the app can seed it using AI + Unsplash. Set `UNSPLASH_ACCESS_KEY` in `.env.local` (get a free key at [Unsplash Developers](https://unsplash.com/developers)). With Azure OpenAI configured, AI suggests search queries; otherwise fixed queries are used. Fetched photos are inserted as public gallery images and linked to catalog items when slugs match.

### API

- **GET** `/api/projects/[id]/gallery` – returns `{ gallery }` for the given project (authenticated homeowner only). Used by the project and edit pages to show “Ideas for your project”.
