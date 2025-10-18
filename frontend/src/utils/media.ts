const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const stripApiSuffix = (url: string) => url.replace(/\/api$/, '');

/**
 * Resolve a relative asset path (e.g. /uploads/...) into an absolute URL based on API config.
 */
export const resolveAssetUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = stripApiSuffix(API_BASE);
  const normalized = path.startsWith('/') ? path : `/${path}`;

  return `${base}${normalized}`;
};

/**
 * Build a deterministic color for avatar fallbacks based on an identifier.
 */
export const getAvatarColor = (seed: string): string => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 80%)`;
};
