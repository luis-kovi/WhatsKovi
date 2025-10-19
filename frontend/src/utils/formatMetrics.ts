const toFixedLocale = (value: number, fractionDigits = 1) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

export const formatDuration = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) {
    return '--';
  }

  const absoluteSeconds = Math.max(Math.round(seconds), 0);
  const hours = Math.floor(absoluteSeconds / 3600);
  const minutes = Math.floor((absoluteSeconds % 3600) / 60);
  const remaining = absoluteSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remaining}s`;
  }

  return `${remaining}s`;
};

export const formatPercentage = (value: number, fractionDigits = 1) =>
  `${toFixedLocale(value * 100, fractionDigits)}%`;

export const formatDelta = (value: number, fractionDigits = 1) => {
  const rounded = toFixedLocale(Math.abs(value), fractionDigits);
  return `${value >= 0 ? '+' : '-'}${rounded}`;
};

export const formatNumber = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export const formatDateRangeLabel = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  });

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
};
