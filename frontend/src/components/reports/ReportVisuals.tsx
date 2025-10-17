'use client';

type TimelinePoint = {
  label: string;
  tickets: number;
  sla: number;
};

type AgentPerformance = {
  id: string;
  name: string;
  tickets: number;
  avgHandle: string;
  satisfaction: number;
};

type QueuePerformance = {
  id: string;
  name: string;
  volume: number;
  wait: string;
  resolution: number;
};

type TagDistribution = {
  id: string;
  name: string;
  value: number;
  color: string;
};

type HeatmapRow = {
  label: string;
  values: number[];
};

type ReportVisualsProps = {
  timeline: TimelinePoint[];
  queues: QueuePerformance[];
  agents: AgentPerformance[];
  tags: TagDistribution[];
  heatmap: HeatmapRow[];
};

const MAX_BAR_WIDTH = 320;

const generateConicGradient = (data: TagDistribution[]) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return 'conic-gradient(#E5E7EB 0deg, #E5E7EB 360deg)';

  let currentAngle = 0;
  const segments = data
    .map((item) => {
      const angle = (item.value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;
      currentAngle = end;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(', ');

  return `conic-gradient(${segments})`;
};

const timelineSvg = (points: TimelinePoint[]) => {
  if (points.length === 0) return null;

  const maxValue = Math.max(...points.map((point) => point.tickets), 1);
  const width = (points.length - 1) * 80 + 40;
  const height = 160;

  const coordinates = points
    .map((point, index) => {
      const x = 20 + index * 80;
      const y = height - (point.tickets / maxValue) * (height - 40) - 20;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-48 w-full text-primary"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF355A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FF355A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="#FF355A"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coordinates}
      />
      <polygon
        fill="url(#timelineGradient)"
        points={`${coordinates} ${width - 20},${height - 20} 20,${height - 20}`}
      />
      {points.map((point, index) => {
        const x = 20 + index * 80;
        const y = height - (point.tickets / maxValue) * (height - 40) - 20;
        return (
          <g key={point.label}>
            <circle cx={x} cy={y} r={5} fill="#FF355A" />
            <text
              x={x}
              y={height - 4}
              textAnchor="middle"
              className="fill-gray-400 text-[10px]"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default function ReportVisuals({ timeline, queues, agents, tags, heatmap }: ReportVisualsProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Linha temporal</h3>
            <span className="text-xs text-gray-500">Tickets finalizados por período</span>
          </div>
          {timelineSvg(timeline)}
          <div className="mt-3 flex gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Tickets finalizados
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary/40" />
              SLA cumprido
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-gray-500">Distribuição por tag</h3>
          <div className="mt-4 flex items-center gap-6">
            <div
              className="h-40 w-40 rounded-full border border-gray-200"
              style={{ background: generateConicGradient(tags) }}
            />
            <div className="flex-1 space-y-3">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round(tag.value)}%</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Desempenho por fila</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              Tempo médio de espera
            </span>
          </header>
          <div className="space-y-4">
            {queues.map((queue) => {
              const percentage = Math.min((queue.volume / (queues[0]?.volume || 1)) * 100, 100);
              return (
                <div key={queue.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">{queue.name}</span>
                    <span className="text-xs text-gray-500">{queue.volume} tickets</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Espera: {queue.wait}</span>
                    <span>Resolução: {queue.resolution}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">Produtividade dos atendentes</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
              Últimos 7 dias
            </span>
          </header>
          <div className="space-y-4">
            {agents.map((agent) => {
              const scale = Math.min((agent.tickets / (agents[0]?.tickets || 1)) * 100, 100);
              return (
                <div key={agent.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-800">{agent.name}</span>
                    <span className="text-xs text-gray-500">{agent.tickets} tickets</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${scale}%`, maxWidth: MAX_BAR_WIDTH }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Tempo médio: {agent.avgHandle}</span>
                    <span>Satisfação: {agent.satisfaction}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase text-gray-500">Heatmap de demanda</h3>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Quantidade de tickets em cada faixa de horário
          </span>
        </header>
        <div className="overflow-x-auto">
          <div className="inline-grid min-w-max grid-cols-[120px_repeat(6,1fr)] gap-2">
            <div />
            {['06h', '10h', '14h', '18h', '22h', '02h'].map((label) => (
              <div key={label} className="text-center text-xs font-semibold uppercase text-gray-500">
                {label}
              </div>
            ))}
            {heatmap.map((row) => (
              <div key={row.label} className="contents">
                <div className="flex items-center text-xs font-semibold text-gray-600">{row.label}</div>
                {row.values.map((value, index) => {
                  const intensity = Math.min(Math.max(value / 100, 0.08), 1);
                  return (
                    <div
                      key={`${row.label}-${index}`}
                      className="flex h-12 w-16 items-center justify-center rounded-xl text-xs font-semibold text-white"
                      style={{
                        backgroundColor: `rgba(255, 53, 90, ${intensity})`
                      }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

