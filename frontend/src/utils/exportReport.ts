import api from '@/services/api';
import type { ReportFiltersRequest } from '@/types/reports';

const extractFileName = (contentDisposition: string | undefined, fallback: string) => {
  if (!contentDisposition) {
    return fallback;
  }

  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  if (match && match[1]) {
    return match[1];
  }

  return fallback;
};

export const exportAdvancedReport = async (
  format: 'csv' | 'xlsx' | 'pdf',
  filters: ReportFiltersRequest
) => {
  const params = {
    ...filters,
    format: format.toUpperCase()
  };

  const response = await api.get<ArrayBuffer>('/reports/export', {
    params,
    responseType: 'arraybuffer'
  });

  const mimeType = response.headers['content-type'] ?? 'application/octet-stream';
  const fileName = extractFileName(
    response.headers['content-disposition'],
    `relatorio-avancado.${format}`
  );

  const blob = new Blob([response.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
