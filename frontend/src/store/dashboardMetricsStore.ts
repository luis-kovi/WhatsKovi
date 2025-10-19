import { create } from 'zustand';
import api from '@/services/api';
import type { DashboardMetricsResponse, DashboardMetricsFilters } from '@/types/dashboard';

type DashboardMetricsState = {
  metrics: DashboardMetricsResponse | null;
  loading: boolean;
  error: string | null;
  lastFilters: DashboardMetricsFilters | null;
  fetchMetrics: (filters: DashboardMetricsFilters) => Promise<void>;
};

export const useDashboardMetricsStore = create<DashboardMetricsState>((set) => ({
  metrics: null,
  loading: false,
  error: null,
  lastFilters: null,

  fetchMetrics: async (filters) => {
    const params = {
      ...filters,
      queueId: filters.queueId || undefined,
      userId: filters.userId || undefined
    };

    set({ loading: true, error: null });

    try {
      const response = await api.get<DashboardMetricsResponse>('/dashboard/metrics', {
        params
      });
      set({
        metrics: response.data,
        loading: false,
        error: null,
        lastFilters: filters
      });
    } catch (error) {
      console.error('Erro ao carregar métricas do dashboard:', error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível carregar as métricas';
      set({ error: message, loading: false });
      throw error;
    }
  }
}));
