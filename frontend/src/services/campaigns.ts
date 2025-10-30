import api from './api';
import type {
  CampaignListParams,
  CampaignProgress,
  CampaignRecipientListResponse,
  CampaignRecipientQuery,
  CreateMessageCampaignRequest,
  MessageCampaign,
  MessageCampaignDetail,
  MessageCampaignListResponse,
  UpdateMessageCampaignRequest
} from '@/types/campaigns';

const serializeListParams = (params?: CampaignListParams) => {
  if (!params) return undefined;
  const query: Record<string, string | number> = {};
  if (params.status?.length) {
    query.status = params.status.join(',');
  }
  if (params.search) {
    query.search = params.search;
  }
  if (params.page) {
    query.page = params.page;
  }
  if (params.pageSize) {
    query.pageSize = params.pageSize;
  }
  return query;
};

const serializeRecipientParams = (params?: CampaignRecipientQuery) => {
  if (!params) return undefined;
  const query: Record<string, string | number> = {};
  if (params.status) {
    query.status = params.status;
  }
  if (params.search) {
    query.search = params.search;
  }
  if (params.page) {
    query.page = params.page;
  }
  if (params.pageSize) {
    query.pageSize = params.pageSize;
  }
  return query;
};

export const fetchCampaigns = async (params?: CampaignListParams) => {
  const response = await api.get<MessageCampaignListResponse>('/message-campaigns', {
    params: serializeListParams(params)
  });
  return response.data;
};

export const fetchCampaign = async (id: string) => {
  const response = await api.get<MessageCampaignDetail>(`/message-campaigns/${id}`);
  return response.data;
};

export const fetchCampaignStats = async (id: string) => {
  const response = await api.get<CampaignProgress>(`/message-campaigns/${id}/stats`);
  return response.data;
};

export const fetchCampaignRecipients = async (id: string, params?: CampaignRecipientQuery) => {
  const response = await api.get<CampaignRecipientListResponse>(`/message-campaigns/${id}/recipients`, {
    params: serializeRecipientParams(params)
  });
  return response.data;
};

export const createCampaign = async (payload: CreateMessageCampaignRequest) => {
  const response = await api.post<MessageCampaign>('/message-campaigns', payload);
  return response.data;
};

export const updateCampaign = async (id: string, payload: UpdateMessageCampaignRequest) => {
  const response = await api.put<MessageCampaign>(`/message-campaigns/${id}`, payload);
  return response.data;
};

export const pauseCampaign = async (id: string) => {
  const response = await api.post<MessageCampaign>(`/message-campaigns/${id}/pause`);
  return response.data;
};

export const resumeCampaign = async (id: string) => {
  const response = await api.post<MessageCampaign>(`/message-campaigns/${id}/resume`);
  return response.data;
};

export const cancelCampaign = async (id: string, reason?: string) => {
  const response = await api.post<MessageCampaign>(`/message-campaigns/${id}/cancel`, reason ? { reason } : undefined);
  return response.data;
};
