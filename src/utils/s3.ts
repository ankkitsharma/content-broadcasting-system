import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "./env";

let client: S3Client | null = null;

function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return client;
}

export function assertS3Enabled() {
  if (env.STORAGE_PROVIDER !== "s3") return;
  const missing: string[] = [];
  if (!env.S3_ENDPOINT) missing.push("S3_ENDPOINT");
  if (!env.S3_BUCKET) missing.push("S3_BUCKET");
  if (!env.S3_ACCESS_KEY_ID) missing.push("S3_ACCESS_KEY_ID");
  if (!env.S3_SECRET_ACCESS_KEY) missing.push("S3_SECRET_ACCESS_KEY");
  if (!env.S3_PUBLIC_BASE_URL) missing.push("S3_PUBLIC_BASE_URL");
  if (missing.length) {
    throw new Error(
      `Missing required env vars for STORAGE_PROVIDER=s3: ${missing.join(", ")}`,
    );
  }
}

export async function putPublicObject(args: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  assertS3Enabled();
  if (env.STORAGE_PROVIDER !== "s3") {
    throw new Error("putPublicObject called when STORAGE_PROVIDER != s3");
  }

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
}

export function getPublicObjectUrl(key: string) {
  assertS3Enabled();
  if (env.STORAGE_PROVIDER !== "s3") {
    throw new Error("getPublicObjectUrl called when STORAGE_PROVIDER != s3");
  }
  return new URL(`/${key}`, env.S3_PUBLIC_BASE_URL!).toString();
}

