// Tiny dependency-free SVG line chart for assessment trends.
// Each row gets one line; x = period index, y = 1..5 score.

type Series = { id: string; name: string; scores: number[] };

const palette = ['#3a60ff', '#16a34a', '#d97706', '#db2777', '#0891b2', '#7c3aed'];

export function TrendChart({ series, periods }: { series: Series[]; periods: string[] }) {
  if (periods.length < 2 || series.length === 0) return null;

  const w = 560;
  const h = 220;
  const padX = 36;
  const padY = 24;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const stepX = periods.length === 1 ? 0 : innerW / (periods.length - 1);

  const yFor = (score: number) => padY + innerH - ((score - 1) / 4) * innerH;
  const xFor = (i: number) => padX + i * stepX;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="min-w-[480px]" role="img">
        {/* gridlines */}
        {[1, 2, 3, 4, 5].map((s) => (
          <g key={s}>
            <line
              x1={padX}
              x2={w - padX}
              y1={yFor(s)}
              y2={yFor(s)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={padX - 6} y={yFor(s) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">
              {s}
            </text>
          </g>
        ))}

        {/* x-axis labels */}
        {periods.map((p, i) => (
          <text
            key={p}
            x={xFor(i)}
            y={h - 6}
            textAnchor="middle"
            fontSize={10}
            fill="#64748b"
          >
            {p}
          </text>
        ))}

        {/* series */}
        {series.map((s, idx) => {
          const color = palette[idx % palette.length];
          const points = s.scores
            .map((score, i) => `${xFor(i)},${yFor(score)}`)
            .join(' ');
          return (
            <g key={s.id}>
              <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
              {s.scores.map((score, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(score)} r={3} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-3 text-xs">
        {series.map((s, idx) => (
          <li key={s.id} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: palette[idx % palette.length] }}
            />
            <span>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
