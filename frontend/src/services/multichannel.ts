import api from './api';

export type ChannelCapability = {
  enabled: boolean;
  configured: boolean;
  from?: string | null;
  provider?: string | null;
};

export type MultichannelCapabilities = {
  whatsapp: ChannelCapability;
  email: ChannelCapability;
  sms: ChannelCapability;
};

export const fetchMultichannelCapabilities = async (): Promise<MultichannelCapabilities> => {
  const response = await api.get<MultichannelCapabilities>('/multichannel/capabilities');
  return response.data;
};

