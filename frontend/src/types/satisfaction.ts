export type SatisfactionOverview = {
  totals: {
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  };
  distribution: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  trend: Array<{
    date: string;
    responses: number;
    averageRating: number | null;
  }>;
  byQueue: Array<{
    id: string;
    name: string;
    color: string | null;
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  }>;
  byAgent: Array<{
    id: string;
    name: string;
    sent: number;
    responded: number;
    responseRate: number;
    averageRating: number | null;
    nps: number | null;
  }>;
  recentComments: Array<{
    id: string;
    ticketId: string;
    contact: string;
    queue: string | null;
    agent: string | null;
    rating: number;
    comment: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    respondedAt: string;
  }>;
};

export type SatisfactionResponseItem = {
  id: string;
  ticketId: string;
  rating: number;
  classification: 'promoter' | 'passive' | 'detractor';
  sentiment: 'positive' | 'neutral' | 'negative';
  comment: string | null;
  respondedAt: string;
  contact: {
    id: string;
    name: string;
  };
  queue: {
    id: string | null;
    name: string | null;
    color: string | null;
  };
  agent: {
    id: string | null;
    name: string | null;
  };
};

export type SatisfactionResponseList = {
  items: SatisfactionResponseItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
