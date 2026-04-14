const LEGACY_ASSET_BASE = "/assets/images";

const IMAGE_BASE =
  import.meta.env.VITE_IMAGE_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/images";

/** Files live under the backend uploads dir but are served at `/images/<file>`. */
function toBackendImageUrl(filename: string): string {
  const name = filename.replace(/^\/+/, "");
  if (IMAGE_BASE.endsWith("/images")) {
    return `${IMAGE_BASE}/${name}`;
  }
    return `${IMAGE_BASE}/images/${name}`;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const resolveImageUrl = (raw?: string | null): string | null => {
  if (!raw?.trim()) return null;
  const value = raw.trim();



  if (value.startsWith("http://") || value.startsWith("https://")) {
  
    return value;
  }

  const uploadsMatch = value.match(/^\/?uploads\/(.+)$/);
  if (uploadsMatch?.[1] && !uploadsMatch[1].includes("..")) {
    return toBackendImageUrl(uploadsMatch[1]);
  }

  if (value.startsWith("/")) {
    return value;
  }

  if (/\.[a-zA-Z0-9]+$/.test(value)) {
    return toBackendImageUrl(value);
  }

  if (UUID.test(value)) {
    return null;
  }

  return `${LEGACY_ASSET_BASE}/${value}.jpg`;
};
