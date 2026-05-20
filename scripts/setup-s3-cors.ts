import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST"],
            AllowedOrigins: ["*"],
            ExposeHeaders: [],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  console.log("✅ CORS policy applied to bucket:", process.env.AWS_S3_BUCKET);
}

main().catch(console.error);
