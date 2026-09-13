const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_STALE_CLAIM_THRESHOLD_SECONDS = 3 * 60;

export function getMaxRetries(): number {
  const raw = process.env.MAX_RETRIES;
  if (!raw) {
    return DEFAULT_MAX_RETRIES;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`MAX_RETRIES must be a non-negative integer, got "${raw}"`);
  }

  return parsed;
}

export function getStaleClaimThresholdMs(): number {
  const raw = process.env.STALE_CLAIM_THRESHOLD_SECONDS;
  if (!raw) {
    return DEFAULT_STALE_CLAIM_THRESHOLD_SECONDS * 1000;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `STALE_CLAIM_THRESHOLD_SECONDS must be a non-negative integer, got "${raw}"`,
    );
  }

  return parsed * 1000;
}
