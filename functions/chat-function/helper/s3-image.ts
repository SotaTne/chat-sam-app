import {
  S3Client,
  GetObjectCommand,
  NoSuchKey,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const isLocal = process.env.AWS_SAM_LOCAL;

let client: S3Client | null = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: "ap-northeast-1",
      // endpoint: isLocal ? "http://host.docker.internal:4566" : undefined, // 要変更
      forcePathStyle: !!isLocal,
    });
  }
  return client;
}

export async function getS3Object({
  bucketName,
  key,
  type,
}: {
  bucketName: string;
  key: string | string[];
  type: "asString" | "asBuffer";
}) {
  const Bucket = bucketName;
  const Key = Array.isArray(key) ? key.join("/") : key;

  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket, Key })
    );

    if (!response.Body) return null;

    if (type === "asString") {
      // Text として取得
      return await response.Body.transformToString();
    }

    if (type === "asBuffer") {
      // バイナリとして取得
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    }

    return null;
  } catch (caught) {
    if (caught instanceof NoSuchKey) {
      console.error(`No such key: s3://${Bucket}/${Key}`);
      return null;
    }

    if (caught instanceof S3ServiceException) {
      console.error(
        `S3 Error (${caught.name}): ${caught.message} at ${Bucket}/${Key}`
      );
      return null;
    }

    throw caught;
  }
}
