import { useMemo } from 'react';
import { getAvatarColor, resolveAssetUrl } from '@/utils/media';

type Options = {
  name?: string | null;
  avatar?: string | null;
  identifier?: string | null;
};

const extractInitials = (name?: string | null) => {
  if (!name) return '';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const useAvatar = ({ name, avatar, identifier }: Options) => {
  return useMemo(() => {
    const resolved = resolveAssetUrl(avatar);
    const initials = extractInitials(name);
    const fallbackId = identifier || name || 'user';
    const backgroundColor = getAvatarColor(fallbackId);

    return {
      src: resolved,
      initials,
      backgroundColor,
      hasImage: Boolean(resolved)
    };
  }, [avatar, identifier, name]);
};
