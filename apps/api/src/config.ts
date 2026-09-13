const DEFAULT_MAX_RETRIES = 3;

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
