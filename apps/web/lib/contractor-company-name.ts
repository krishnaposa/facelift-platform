import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getEncryptionKey(): Buffer {
  const raw = process.env.CONTRACTOR_COMPANY_NAME_KEY;
  if (!raw?.trim()) {
    throw new Error(
      'CONTRACTOR_COMPANY_NAME_KEY is not set (use 64 hex chars = 32 bytes, or base64-encoded 32 bytes)'
    );
  }
  const s = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    return Buffer.from(s, 'hex');
  }
  const b64 = Buffer.from(s, 'base64');
  if (b64.length === KEY_LEN) {
    return b64;
  }
  throw new Error('CONTRACTOR_COMPANY_NAME_KEY must be 64 hex characters or base64 for 32 bytes');
}

/**
 * Persisted form of the legal/display company name (never store plaintext in DB after backfill).
 */
export function encryptCompanyName(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptCompanyName(encB64: string | null | undefined): string | null {
  if (!encB64?.trim()) return null;
  try {
    const buf = Buffer.from(encB64, 'base64');
    if (buf.length < IV_LEN + TAG_LEN) return null;
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const key = getEncryptionKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Homeowner, admin, or contractor viewing own company — real name when key matches. */
export function contractorCompanyDisplayName(
  profile: { companyName?: string | null; companyNameEncrypted?: string | null } | null | undefined
): string {
  if (!profile) return 'Contractor';
  const dec = decryptCompanyName(profile.companyNameEncrypted ?? null);
  if (dec) return dec;
  if (profile.companyName?.trim()) return profile.companyName.trim();
  return 'Contractor';
}

/**
 * Stable anonymous label for a competing contractor on a project (no decryption of name).
 * Same (project, contractor) always maps to the same label.
 */
export function peerBidderLabel(projectId: string, contractorId: string): string {
  const salt =
    process.env.CONTRACTOR_PEER_LABEL_SALT?.trim() || 'facelift-peer-bidder-label-v1';
  const h = createHmac('sha256', salt)
    .update(`${projectId}:${contractorId}`)
    .digest('hex');
  return `Bidder ${h.slice(0, 4).toUpperCase()}`;
}
