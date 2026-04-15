import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret
});

export function buildSignedUploadParams(folder: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinaryApiSecret);
  return {
    timestamp,
    signature,
    apiKey: env.cloudinaryApiKey,
    cloudName: env.cloudinaryCloudName,
    folder
  };
}

export { cloudinary };
