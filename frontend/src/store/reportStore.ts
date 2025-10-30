import { create } from 'zustand';
import api from '@/services/api';
import type {
  AdvancedReportResponse,
  ReportFiltersRequest,
  ReportSnapshot
} from '@/types/reports';

type ReportState = {
  report: AdvancedReportResponse | null;
  loading: boolean;
  error: string | null;
  lastFilters: ReportFiltersRequest | null;
  snapshots: ReportSnapshot[];
  snapshotsLoading: boolean;
  fetchReport: (filters: ReportFiltersRequest) => Promise<void>;
  fetchSnapshots: () => Promise<void>;
};

export const useReportStore = create<ReportState>((set) => ({
  report: null,
  loading: false,
  error: null,
  lastFilters: null,
  snapshots: [],
  snapshotsLoading: false,

  fetchReport: async (filters) => {
    set({ loading: true, error: null });

    try {
      const response = await api.get<AdvancedReportResponse>('/reports', {
        params: filters
      });

      set({
        report: response.data,
        loading: false,
        error: null,
        lastFilters: filters
      });
    } catch (error) {
      console.error('Erro ao carregar relatório avançado:', error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível carregar o relatório.';
      set({ error: message, loading: false });
      throw error;
    }
  },

  fetchSnapshots: async () => {
    set({ snapshotsLoading: true });
    try {
      const response = await api.get<ReportSnapshot[]>('/reports/snapshots');
      set({ snapshots: response.data, snapshotsLoading: false });
    } catch (error) {
      console.error('Erro ao carregar relatórios gerados:', error);
      set({ snapshotsLoading: false });
    }
  }
}));
