import { useMemo } from 'react';

export const useNotesFormatter = (notes?: string | null) => {
  return useMemo(() => {
    if (!notes) {
      return {
        formatted: '',
        paragraphs: [],
        isEmpty: true
      };
    }

    const trimmed = notes.trim();
    if (!trimmed) {
      return {
        formatted: '',
        paragraphs: [],
        isEmpty: true
      };
    }

    const normalized = trimmed.replace(/\r\n/g, '\n');
    const paragraphs = normalized.split('\n').map((line) => line.trim());

    return {
      formatted: normalized,
      paragraphs,
      isEmpty: false
    };
  }, [notes]);
};
