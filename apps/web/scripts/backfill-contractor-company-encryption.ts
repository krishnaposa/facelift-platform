/**
 * One-time: encrypt legacy plaintext companyName into companyNameEncrypted and clear plaintext.
 *
 * Requires: DATABASE_URL, CONTRACTOR_COMPANY_NAME_KEY (in repo root .env)
 * Usage: cd apps/web && npx tsx scripts/backfill-contractor-company-encryption.ts
 */
import path from 'path';
import { readFileSync } from 'fs';

/** Load repo root .env before prisma (tsx does not load it by default). */
function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore — use existing process.env (e.g. CI)
  }
}

loadRootEnv();

async function main() {
  const { prisma } = await import('../lib/prisma');
  const { encryptCompanyName } = await import('../lib/contractor-company-name');

  try {
    const rows = await prisma.contractorProfile.findMany({
      where: {
        companyNameEncrypted: null,
        companyName: { not: null },
      },
      select: { id: true, companyName: true },
    });

    console.log(`Found ${rows.length} contractor profile(s) to encrypt.`);

    for (const r of rows) {
      const plain = r.companyName?.trim();
      if (!plain) continue;
      await prisma.contractorProfile.update({
        where: { id: r.id },
        data: {
          companyNameEncrypted: encryptCompanyName(plain),
          companyName: null,
        },
      });
      console.log(`Encrypted profile ${r.id}`);
    }

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
