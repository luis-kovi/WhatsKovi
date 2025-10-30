import { create } from 'zustand';
import {
  fetchCampaigns,
  fetchCampaign,
  createCampaign,
  updateCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  fetchCampaignStats,
  fetchCampaignRecipients
} from '@/services/campaigns';
import type {
  CampaignListParams,
  CampaignProgress,
  CampaignRecipientListResponse,
  CampaignRecipientQuery,
  CreateMessageCampaignRequest,
  MessageCampaign,
  MessageCampaignDetail,
  MessageCampaignStatus,
  UpdateMessageCampaignRequest
} from '@/types/campaigns';

type CampaignState = {
  items: MessageCampaign[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  creating: boolean;
  detailById: Record<string, MessageCampaignDetail>;
  statsById: Record<string, CampaignProgress>;
  statsLoadingById: Record<string, boolean>;
  recipientsById: Record<string, CampaignRecipientListResponse>;
  recipientFiltersById: Record<string, CampaignRecipientQuery | undefined>;
  recipientsLoadingById: Record<string, boolean>;
  lastParams?: CampaignListParams;
  fetchCampaigns: (params?: CampaignListParams) => Promise<void>;
  refetchCampaigns: () => Promise<void>;
  fetchCampaign: (id: string) => Promise<MessageCampaignDetail>;
  createCampaign: (payload: CreateMessageCampaignRequest) => Promise<MessageCampaign>;
  updateCampaign: (id: string, payload: UpdateMessageCampaignRequest) => Promise<MessageCampaign>;
  pauseCampaign: (id: string) => Promise<MessageCampaign>;
  resumeCampaign: (id: string) => Promise<MessageCampaign>;
  cancelCampaign: (id: string, reason?: string) => Promise<MessageCampaign>;
  fetchCampaignStats: (id: string, force?: boolean) => Promise<CampaignProgress>;
  fetchCampaignRecipients: (id: string, params?: CampaignRecipientQuery) => Promise<CampaignRecipientListResponse>;
};

const applyCampaignUpdate = (campaigns: MessageCampaign[], updated: MessageCampaign) =>
  campaigns.map((campaign) => (campaign.id === updated.id ? { ...campaign, ...updated } : campaign));

export const useCampaignStore = create<CampaignState>((set, get) => ({
  items: [],
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 0,
  loading: false,
  creating: false,
  detailById: {},
  statsById: {},
  statsLoadingById: {},
  recipientsById: {},
  recipientFiltersById: {},
  recipientsLoadingById: {},

  fetchCampaigns: async (params) => {
    set({ loading: true, lastParams: params });
    try {
      const response = await fetchCampaigns(params);
      set({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  refetchCampaigns: async () => {
    const { lastParams } = get();
    await get().fetchCampaigns(lastParams);
  },

  fetchCampaign: async (id) => {
    const detail = await fetchCampaign(id);
    set((state) => ({
      detailById: { ...state.detailById, [id]: detail },
      items: applyCampaignUpdate(state.items, detail)
    }));
    return detail;
  },

  createCampaign: async (payload) => {
    set({ creating: true });
    try {
      const created = await createCampaign(payload);
      set((state) => ({
        creating: false,
        items: [created, ...state.items],
        total: state.total + 1,
        detailById: { ...state.detailById, [created.id]: created }
      }));
      return created;
    } catch (error) {
      set({ creating: false });
      throw error;
    }
  },

  updateCampaign: async (id, payload) => {
    const updated = await updateCampaign(id, payload);
    set((state) => ({
      items: applyCampaignUpdate(state.items, updated),
      detailById: { ...state.detailById, [id]: { ...(state.detailById[id] ?? updated), ...updated } }
    }));
    return updated;
  },

  pauseCampaign: async (id) => {
    const updated = await pauseCampaign(id);
    set((state) => ({
      items: applyCampaignUpdate(state.items, updated),
      detailById: { ...state.detailById, [id]: { ...(state.detailById[id] ?? updated), ...updated } }
    }));
    return updated;
  },

  resumeCampaign: async (id) => {
    const updated = await resumeCampaign(id);
    set((state) => ({
      items: applyCampaignUpdate(state.items, updated),
      detailById: { ...state.detailById, [id]: { ...(state.detailById[id] ?? updated), ...updated } }
    }));
    return updated;
  },

  cancelCampaign: async (id, reason) => {
    const updated = await cancelCampaign(id, reason);
    set((state) => ({
      items: applyCampaignUpdate(state.items, updated),
      detailById: { ...state.detailById, [id]: { ...(state.detailById[id] ?? updated), ...updated } }
    }));
    return updated;
  },

  fetchCampaignStats: async (id, force) => {
    if (!force) {
      const existing = get().statsById[id];
      if (existing) {
        return existing;
      }
    }

    set((state) => ({
      statsLoadingById: { ...state.statsLoadingById, [id]: true }
    }));

    try {
      const stats = await fetchCampaignStats(id);
      set((state) => ({
        statsById: { ...state.statsById, [id]: stats },
        statsLoadingById: { ...state.statsLoadingById, [id]: false }
      }));
      return stats;
    } catch (error) {
      set((state) => ({
        statsLoadingById: { ...state.statsLoadingById, [id]: false }
      }));
      throw error;
    }
  },

  fetchCampaignRecipients: async (id, params) => {
    set((state) => ({
      recipientsLoadingById: { ...state.recipientsLoadingById, [id]: true },
      recipientFiltersById: { ...state.recipientFiltersById, [id]: params }
    }));

    try {
      const response = await fetchCampaignRecipients(id, params);
      set((state) => ({
        recipientsById: { ...state.recipientsById, [id]: response },
        recipientsLoadingById: { ...state.recipientsLoadingById, [id]: false }
      }));
      return response;
    } catch (error) {
      set((state) => ({
        recipientsLoadingById: { ...state.recipientsLoadingById, [id]: false }
      }));
      throw error;
    }
  }
}));

export const getStatusLabel = (status: MessageCampaignStatus) => {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho';
    case 'SCHEDULED':
      return 'Agendada';
    case 'RUNNING':
      return 'Em andamento';
    case 'PAUSED':
      return 'Pausada';
    case 'COMPLETED':
      return 'Concluída';
    case 'CANCELLED':
      return 'Cancelada';
    case 'FAILED':
      return 'Falha';
    default:
      return status;
  }
};
