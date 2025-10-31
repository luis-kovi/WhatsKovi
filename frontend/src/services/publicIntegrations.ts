import type { PublicAnalyticsConfig } from '@/types/integrations';

const DEFAULT_API_BASE = 'http://localhost:3001/api';
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');

export const fetchPublicAnalyticsConfig = async (): Promise<PublicAnalyticsConfig> => {
  const response = await fetch(`${API_BASE}/public/integrations/analytics`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to load analytics config (${response.status})`);
  }

  return (await response.json()) as PublicAnalyticsConfig;
};
