const requestBuckets = new Map();

export const createRouteRateLimiter = ({ windowMs, max, message }) => {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}:${req.path}`;
    const existing = requestBuckets.get(key);

    const bucket =
      !existing || existing.expiresAt <= now
        ? { count: 1, expiresAt: now + windowMs }
        : { ...existing, count: existing.count + 1 };

    requestBuckets.set(key, bucket);

    if (requestBuckets.size > 5000) {
      for (const [bucketKey, value] of requestBuckets.entries()) {
        if (value.expiresAt <= now) {
          requestBuckets.delete(bucketKey);
        }
      }
    }

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        message,
        retryAfterSeconds
      });
    }

    return next();
  };
};
