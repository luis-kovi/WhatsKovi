'use client';

type HighlightMetric = {
  label: string;
  value: string;
  description: string;
  trend?: {
    value: number;
    label: string;
  };
  accent?: string;
};

type ServiceMetric = {
  label: string;
  value: string;
  hint: string;
};

type ReportHighlightsProps = {
  metrics: HighlightMetric[];
  serviceLevels: ServiceMetric[];
};

export default function ReportHighlights({ metrics, serviceLevels }: ReportHighlightsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase text-gray-500">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{metric.value}</p>
          <p className="mt-1 text-xs text-gray-500">{metric.description}</p>
          {metric.trend && (
            <p
              className={`mt-3 inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold ${
                metric.trend.value >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {metric.trend.value >= 0 ? '+' : ''}
              {metric.trend.value}% · {metric.trend.label}
            </p>
          )}
        </article>
      ))}

      <article className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-gray-500">Níveis de serviço</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            SLA alvo: 90% em 2h
          </span>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {serviceLevels.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-xs font-semibold uppercase text-gray-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{metric.value}</p>
              <p className="mt-1 text-xs text-gray-500">{metric.hint}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

