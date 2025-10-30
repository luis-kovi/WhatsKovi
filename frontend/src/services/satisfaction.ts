import api from './api';
import type {
  SatisfactionOverview,
  SatisfactionResponseList
} from '@/types/satisfaction';

const buildParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

export const fetchSatisfactionOverview = async (params: {
  startDate: string;
  endDate: string;
  queueId?: string;
  agentId?: string;
}) => {
  const response = await api.get<SatisfactionOverview>('/satisfaction/overview', {
    params: buildParams(params)
  });
  return response.data;
};

export const fetchSatisfactionResponses = async (params: {
  startDate: string;
  endDate: string;
  queueId?: string;
  agentId?: string;
  page?: number;
  pageSize?: number;
}) => {
  const response = await api.get<SatisfactionResponseList>('/satisfaction/responses', {
    params: buildParams(params)
  });
  return response.data;
};

export const getTicketSurveyStatus = async (ticketId: string) => {
  const response = await api.get(`/tickets/${ticketId}/satisfaction`);
  return response.data as {
    id: string;
    status: string;
    rating: number | null;
    comment: string | null;
    sentAt: string | null;
    respondedAt: string | null;
    link: string;
    contact: { id: string; name: string };
    queue: { id: string; name: string; color: string } | null;
    agent: { id: string; name: string } | null;
  };
};

export const resendTicketSurvey = async (ticketId: string, force = false) => {
  const response = await api.post(`/tickets/${ticketId}/satisfaction/send`, { force });
  return response.data as {
    survey: {
      id: string;
      status: string;
      sentAt: string | null;
      respondedAt: string | null;
    };
    messageSent: boolean;
    reason?: string;
  };
};
