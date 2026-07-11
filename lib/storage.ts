import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { ApiError } from "./api-utils.js";
import { validateTemplateImage } from "./template-render-contract.js";

const IMAGE_PREFIX = "template-images";

function assertStorageConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(
      "STORAGE_NOT_CONFIGURED",
      "Vercel Blob storage is not configured",
      500
    );
  }
}

function safeName(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  contentType = "application/octet-stream"
) {
  const validatedContentType = validateTemplateImage(file, contentType);
  assertStorageConfigured();
  const path = `${IMAGE_PREFIX}/${Date.now()}-${randomUUID()}-${safeName(filename)}`;

  try {
    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: validatedContentType,
    });

    return { url: blob.url, path: blob.pathname };
  } catch (error) {
    throw new ApiError(
      "STORAGE_UPLOAD_FAILED",
      error instanceof Error ? error.message : "Image upload failed",
      500
    );
  }
}

export async function deleteImage(path: string) {
  assertStorageConfigured();

  try {
    await del(path);
  } catch (error) {
    throw new ApiError(
      "STORAGE_DELETE_FAILED",
      error instanceof Error ? error.message : "Image delete failed",
      500
    );
  }
}
