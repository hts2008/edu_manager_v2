import { ApiError } from "./api-utils.js";

export const MAX_TEMPLATE_IMAGE_BYTES = 8 * 1024 * 1024;
export const TEMPLATE_IMAGE_FETCH_TIMEOUT_MS = 5_000;

const DEFAULT_ALLOWED_IMAGE_HOST_SUFFIXES = [
  ".public.blob.vercel-storage.com",
  ".blob.vercel-storage.com",
];

type OverlayAlignment = "left" | "center" | "right";

export interface TemplateBindingOverlay {
  field: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  align?: OverlayAlignment;
  bold?: boolean;
  italic?: boolean;
  fallback?: string;
  prefix?: string;
  suffix?: string;
}

export interface TemplateRenderContractV2 {
  version: 2;
  background: { src: string };
  bindings: TemplateBindingOverlay[];
  canvas?: { width: number; height: number };
}

interface FetchImageOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  allowedHosts?: string[];
}

function contractError(message: string): never {
  throw new ApiError("INVALID_TEMPLATE_RENDER_CONTRACT", message, 422);
}

function finiteNumber(value: unknown, field: string, options: { min?: number; required?: boolean } = {}) {
  if (value === undefined || value === null || value === "") {
    if (options.required) contractError(`${field} is required`);
    return undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (options.min !== undefined && number < options.min)) {
    contractError(`${field} must be a finite number${options.min !== undefined ? ` >= ${options.min}` : ""}`);
  }
  return number;
}

function stringValue(value: unknown, field: string, required = false) {
  if (typeof value !== "string" || !value.trim()) {
    if (required) contractError(`${field} is required`);
    return undefined;
  }
  return value.trim();
}

function parseBinding(value: unknown, index: number): TemplateBindingOverlay {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    contractError(`bindings[${index}] must be an object`);
  }
  const input = value as Record<string, unknown>;
  const align = input.align ?? input.alignment;
  if (align !== undefined && !["left", "center", "right"].includes(String(align))) {
    contractError(`bindings[${index}].align is invalid`);
  }

  const binding: TemplateBindingOverlay = {
    field: stringValue(input.field ?? input.path ?? input.binding, `bindings[${index}].field`, true)!,
    x: finiteNumber(input.x ?? input.left, `bindings[${index}].x`, { min: 0, required: true })!,
    y: finiteNumber(input.y ?? input.top, `bindings[${index}].y`, { min: 0, required: true })!,
  };
  const width = finiteNumber(input.width, `bindings[${index}].width`, { min: 0 });
  const height = finiteNumber(input.height, `bindings[${index}].height`, { min: 0 });
  const fontSize = finiteNumber(input.fontSize ?? input.font_size, `bindings[${index}].fontSize`, { min: 1 });
  const color = stringValue(input.color ?? input.fill, `bindings[${index}].color`);
  const fallback = stringValue(input.fallback ?? input.defaultValue, `bindings[${index}].fallback`);
  const prefix = typeof input.prefix === "string" ? input.prefix : undefined;
  const suffix = typeof input.suffix === "string" ? input.suffix : undefined;

  if (width !== undefined) binding.width = width;
  if (height !== undefined) binding.height = height;
  if (fontSize !== undefined) binding.fontSize = fontSize;
  if (color !== undefined) binding.color = color;
  if (align !== undefined) binding.align = align as OverlayAlignment;
  if (input.bold !== undefined) binding.bold = Boolean(input.bold);
  if (input.italic !== undefined) binding.italic = Boolean(input.italic);
  if (fallback !== undefined) binding.fallback = fallback;
  if (prefix !== undefined) binding.prefix = prefix;
  if (suffix !== undefined) binding.suffix = suffix;
  return binding;
}

export function isTemplateRenderContractV2(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const version = (value as Record<string, unknown>).version;
  return version === 2 || version === "2" || version === "2.0";
}

export function parseTemplateRenderContract(value: unknown): TemplateRenderContractV2 {
  if (!isTemplateRenderContractV2(value)) {
    contractError("version must be 2");
  }
  const input = value as Record<string, any>;
  const backgroundValue = input.background;
  const backgroundSrc = stringValue(
    typeof backgroundValue === "string"
      ? backgroundValue
      : backgroundValue?.src ?? backgroundValue?.url ?? input.backgroundUrl ?? input.background_url,
    "background.src",
    true
  )!;
  const bindingValues = input.bindings ?? input.overlays ?? input.dynamicBindings;
  if (!Array.isArray(bindingValues)) contractError("bindings must be an array");

  const canvasInput = input.canvas ?? input.coordinateSpace;
  let canvas: TemplateRenderContractV2["canvas"];
  if (canvasInput !== undefined) {
    if (!canvasInput || typeof canvasInput !== "object" || Array.isArray(canvasInput)) {
      contractError("canvas must be an object");
    }
    canvas = {
      width: finiteNumber(canvasInput.width, "canvas.width", { min: 1, required: true })!,
      height: finiteNumber(canvasInput.height, "canvas.height", { min: 1, required: true })!,
    };
  }

  return {
    version: 2,
    background: { src: backgroundSrc },
    bindings: bindingValues.map(parseBinding),
    ...(canvas ? { canvas } : {}),
  };
}

function detectedImageType(bytes: Buffer) {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return undefined;
}

export function validateTemplateImage(
  bytes: Buffer,
  declaredContentType?: string | null,
  maxBytes = MAX_TEMPLATE_IMAGE_BYTES
) {
  const declared = declaredContentType?.split(";", 1)[0].trim().toLowerCase();
  if (declared && !["image/png", "image/jpeg", "image/jpg"].includes(declared)) {
    throw new ApiError("INVALID_FILE_TYPE", "Only PNG and JPEG images are allowed", 400);
  }
  if (!bytes.length) throw new ApiError("EMPTY_FILE", "Uploaded image is empty", 400);
  if (bytes.length > maxBytes) {
    throw new ApiError("IMAGE_TOO_LARGE", `Image exceeds the ${maxBytes} byte limit`, 413);
  }
  const detected = detectedImageType(bytes);
  if (!detected) throw new ApiError("INVALID_IMAGE_SIGNATURE", "Image signature is invalid", 400);
  if (declared && (declared === "image/png") !== (detected === "image/png")) {
    throw new ApiError("IMAGE_TYPE_MISMATCH", "Image content does not match its declared type", 400);
  }
  return detected;
}

function configuredAllowedHosts() {
  return (process.env.TEMPLATE_IMAGE_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedImageHost(hostname: string, allowedHosts: string[]) {
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const normalized = allowed.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return normalized.startsWith(".")
      ? host.endsWith(normalized) && host.length > normalized.length
      : host === normalized;
  });
}

async function readBoundedBody(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError("IMAGE_TOO_LARGE", `Image exceeds the ${maxBytes} byte limit`, 413);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError("IMAGE_TOO_LARGE", `Image exceeds the ${maxBytes} byte limit`, 413);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function fetchTemplateImage(src: string, options: FetchImageOptions = {}) {
  const dataMatch = src.trim().match(/^data:(image\/(?:png|jpe?g));base64,([a-z0-9+/=\s]+)$/i);
  if (dataMatch) {
    const bytes = Buffer.from(dataMatch[2].replace(/\s/g, ""), "base64");
    const contentType = validateTemplateImage(bytes, dataMatch[1], options.maxBytes);
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }
  if (src.trim().startsWith("data:")) {
    throw new ApiError("INVALID_IMAGE_DATA_URI", "Background data URI is invalid", 422);
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    throw new ApiError("INVALID_IMAGE_URL", "Background image URL is invalid", 422);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new ApiError("INVALID_IMAGE_URL", "Background image URL must use HTTPS without credentials or a custom port", 422);
  }
  const allowedHosts = options.allowedHosts ?? [
    ...DEFAULT_ALLOWED_IMAGE_HOST_SUFFIXES,
    ...configuredAllowedHosts(),
  ];
  if (!isAllowedImageHost(url.hostname, allowedHosts)) {
    throw new ApiError("IMAGE_HOST_NOT_ALLOWED", "Background image host is not allowed", 422);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? TEMPLATE_IMAGE_FETCH_TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept: "image/png,image/jpeg" },
    });
    if (!response.ok) {
      throw new ApiError("IMAGE_FETCH_FAILED", `Background image fetch failed with HTTP ${response.status}`, 502);
    }
    const bytes = await readBoundedBody(response, options.maxBytes ?? MAX_TEMPLATE_IMAGE_BYTES);
    const contentType = validateTemplateImage(bytes, response.headers.get("content-type"), options.maxBytes);
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError("IMAGE_FETCH_TIMEOUT", "Background image fetch timed out", 504);
    }
    throw new ApiError("IMAGE_FETCH_FAILED", "Background image could not be fetched", 502);
  } finally {
    clearTimeout(timeout);
  }
}
