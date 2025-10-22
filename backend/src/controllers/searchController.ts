import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  executeSearch,
  fetchSearchHistory,
  purgeSearchHistory,
  type SearchType,
  type SearchFilters
} from '../services/searchService';

const ALLOWED_TYPES: SearchType[] = ['messages', 'contacts', 'tickets'];

const parseStringArray = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  const values = Array.isArray(value) ? value : [value];
  const flattened = values
    .flatMap((entry) =>
      typeof entry === 'string'
        ? entry.split(',').map((item) => item.trim())
        : typeof entry === 'number'
        ? [String(entry)]
        : []
    )
    .filter((item): item is string => typeof item === 'string' && item.length > 0);

  if (!flattened.length) return undefined;
  return Array.from(new Set(flattened));
};

const parseTypes = (value: unknown): SearchType[] | undefined => {
  const items = parseStringArray(value);
  if (!items) return undefined;
  const filtered = items.filter((item): item is SearchType =>
    ALLOWED_TYPES.includes(item as SearchType)
  );
  return filtered.length ? filtered : undefined;
};

const clampLimit = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const rawValue = Array.isArray(value) ? value[0] : value;
  const raw =
    typeof rawValue === 'number'
      ? String(rawValue)
      : typeof rawValue === 'string'
      ? rawValue
      : undefined;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(Math.max(parsed, 5), 50);
};

export const performAdvancedSearch = async (req: AuthRequest, res: Response) => {
  try {
    const term = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = clampLimit(req.query.limit);

    const filters: SearchFilters = {
      types: parseTypes(req.query.types),
      queueIds: parseStringArray(req.query.queueIds),
      userIds: parseStringArray(req.query.userIds),
      tagIds: parseStringArray(req.query.tagIds),
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    };

    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const result = await executeSearch(req.user.id, term, filters, limit);
    return res.json(result);
  } catch (error) {
    console.error('Erro ao executar busca avançada:', error);
    return res.status(500).json({ error: 'Erro ao executar busca avançada' });
  }
};

export const listAdvancedSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const limit = clampLimit(req.query.limit);
    const history = await fetchSearchHistory(req.user.id, limit ?? 10);
    return res.json({ items: history });
  } catch (error) {
    console.error('Erro ao buscar histórico de pesquisas:', error);
    return res.status(500).json({ error: 'Erro ao carregar histórico de buscas' });
  }
};

export const clearAdvancedSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    await purgeSearchHistory(req.user.id);
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao limpar histórico de pesquisas:', error);
    return res.status(500).json({ error: 'Erro ao limpar histórico de buscas' });
  }
};
