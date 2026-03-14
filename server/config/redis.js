import { createClient } from "redis";

let redisClient = null;
let redisConnected = false;
const memoryCache = new Map();

export const cleanupMemoryCache = () => {
  const now = Date.now();

  for (const [key, value] of memoryCache.entries()) {
    if (!value || value.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
};

export const initializeRedisCache = async () => {
  const redisUrl = String(process.env.REDIS_URL || "").trim();

  if (!redisUrl) {
    console.warn("Redis URL is not configured. Falling back to in-memory cache.");
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });

    redisClient.on("error", (error) => {
      console.error("Redis client error:", error.message);
    });

    await redisClient.connect();
    redisConnected = true;
    console.log("Redis cache connected");

    return redisClient;
  } catch (error) {
    redisClient = null;
    redisConnected = false;
    console.warn("Redis unavailable. Using in-memory cache fallback.");

    return null;
  }
};

export const getCache = async (key) => {
  if (redisConnected && redisClient) {
    const raw = await redisClient.get(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  cleanupMemoryCache();
  const cached = memoryCache.get(key);

  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }

  return cached.value;
};

export const setCache = async (key, value, ttlSeconds = 300) => {
  if (redisConnected && redisClient) {
    await redisClient.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSeconds) });
    return;
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + (Math.max(1, ttlSeconds) * 1000)
  });

  if (memoryCache.size > 4000) {
    cleanupMemoryCache();
  }
};

export const deleteCache = async (key) => {
  if (redisConnected && redisClient) {
    await redisClient.del(key);
    return;
  }

  memoryCache.delete(key);
};

export const getOrSetCache = async (key, ttlSeconds, resolver) => {
  const cached = await getCache(key);

  if (cached !== null) {
    return cached;
  }

  const freshData = await resolver();
  await setCache(key, freshData, ttlSeconds);

  return freshData;
};
