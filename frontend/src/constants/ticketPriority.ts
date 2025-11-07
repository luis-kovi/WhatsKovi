export const TICKET_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' }
] as const;

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente'
};

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-500',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-rose-500'
};
