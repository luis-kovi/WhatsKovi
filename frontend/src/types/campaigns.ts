export type MessageCampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type MessageCampaignRecipientStatus =
  | 'PENDING'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'SKIPPED'
  | 'CANCELLED';

export type CampaignProgress = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
  pending: number;
  completion: number;
};

export type CampaignSummaryUser = {
  id: string;
  name: string;
  email?: string | null;
};

export type CampaignWhatsapp = {
  id: string;
  name: string;
  phoneNumber?: string | null;
};

export type CampaignQueue = {
  id: string;
  name: string;
  color: string;
};

export type MessageCampaign = {
  id: string;
  name: string;
  description?: string | null;
  body: string;
  mediaUrl?: string | null;
  status: MessageCampaignStatus;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  rateLimitPerMinute: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  cancelledCount: number;
  createdAt: string;
  updatedAt: string;
  whatsapp?: CampaignWhatsapp | null;
  queue?: CampaignQueue | null;
  createdBy?: CampaignSummaryUser | null;
  updatedBy?: CampaignSummaryUser | null;
  progress?: CampaignProgress;
};

export type MessageCampaignDetail = MessageCampaign & {
  recipientsByStatus?: Partial<Record<MessageCampaignRecipientStatus, number>>;
};

export type MessageCampaignListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: MessageCampaign[];
};

export type MessageCampaignRecipient = {
  id: string;
  status: MessageCampaignRecipientStatus;
  error?: string | null;
  sentAt?: string | null;
  scheduledAt?: string | null;
  contact: {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string | null;
    isBlocked: boolean;
  };
};

export type CampaignRecipientListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: MessageCampaignRecipient[];
};

export type CreateMessageCampaignRequest = {
  name: string;
  description?: string;
  body: string;
  mediaUrl?: string | null;
  whatsappId: string;
  queueId?: string | null;
  contactIds?: string[];
  segmentIds?: string[];
  filters?: Record<string, unknown>;
  scheduledFor?: string | null;
  rateLimitPerMinute?: number | null;
};

export type UpdateMessageCampaignRequest = Partial<
  Pick<
    CreateMessageCampaignRequest,
    'name' | 'description' | 'body' | 'mediaUrl' | 'scheduledFor' | 'rateLimitPerMinute'
  >
>;

export type CampaignListParams = {
  status?: MessageCampaignStatus[];
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CampaignRecipientQuery = {
  status?: MessageCampaignRecipientStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};
