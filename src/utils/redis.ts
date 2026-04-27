import { createClient } from "redis";

import { env } from "./env";

type AppRedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<AppRedisClient> | null = null;

export async function getRedisClient(): Promise<AppRedisClient | null> {
  if (!env.REDIS_URL) return null;

  if (!clientPromise) {
    const client = createClient({ url: env.REDIS_URL });
    client.on("error", (err) => {
      // Never crash the API on transient Redis errors.
      console.error("Redis error:", err);
    });
    clientPromise = client.connect().then(() => client);
  }

  try {
    return await clientPromise;
  } catch {
    clientPromise = null;
    return null;
  }
}

