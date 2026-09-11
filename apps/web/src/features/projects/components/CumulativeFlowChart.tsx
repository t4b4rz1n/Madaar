import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { getProjectCfd } from "../api/analyticsApi";
import type { CfdData, CfdStatus } from "../types/analytics";

// Palette auto-assigned to statuses in order (can be extended)
const STATUS_COLORS = [
  "var(--color-primary)", // indigo
  "var(--color-warning)", // amber
  "var(--color-success)", // emerald
  "var(--color-info)", // blue
  "var(--color-error)", // red
  "var(--color-secondary)", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
];

interface CumulativeFlowChartProps {
  projectId: string;
  boardId?: string;
  startDate?: string;
  endDate?: string;
  tz?: string;
  /** If true, shows the header and date-range controls */
  showControls?: boolean;
}

export default function CumulativeFlowChart({
  projectId,
  boardId,
  startDate: initialStart,
  endDate: initialEnd,
  tz,
  showControls = true,
}: CumulativeFlowChartProps) {
  const [data, setData] = useState<CfdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local range state (only used when showControls=true)
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const [start, setStart] = useState(initialStart ?? thirtyDaysAgo);
  const [end, setEnd] = useState(initialEnd ?? today);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProjectCfd(projectId, {
      board_id: boardId,
      start_date: start,
      end_date: end,
      tz: tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then(setData)
      .catch(() => setError("Error loading CFD data"))
      .finally(() => setLoading(false));
  }, [projectId, boardId, start, end, tz]);

  // Build recharts-compatible data: [{date, <code>: count, ...}]
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.data.map((day) => ({
      date: day.date,
      ...day.counts,
    }));
  }, [data]);

  const colorFor = (index: number) =>
    STATUS_COLORS[index % STATUS_COLORS.length];

  if (loading) return <CFDSkeleton />;
  if (error) return <CFDError message={error} />;
  if (!data || data.data.length === 0)
    return <CFDEmpty message="No data available for this time range." />;

  const statuses: CfdStatus[] = data.statuses;

  return (
    <div
      id="cfd-chart-container"
      style={{
        background: "var(--color-surface, var(--color-base-100))",
        borderRadius: 16,
        padding: "24px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      {showControls && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 12,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-text-primary, var(--color-base-content))",
              }}
            >
              Cumulative Flow Diagram (CFD)
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--color-text-secondary, color-mix(in srgb, var(--color-base-content) 60%, transparent))",
              }}
            >
              Task distribution across statuses over time
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="cfd-start-date"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={inputStyle}
            />
            <input
              id="cfd-end-date"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <defs>
            {statuses.map((s, i) => (
              <linearGradient
                key={s.code}
                id={`cfd-grad-${s.code}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={colorFor(i)} stopOpacity={0.5} />
                <stop offset="95%" stopColor={colorFor(i)} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--color-base-content) 6%, transparent)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "color-mix(in srgb, var(--color-base-content) 60%, transparent)" }}
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "color-mix(in srgb, var(--color-base-content) 60%, transparent)" }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-base-100)",
              border: "1px solid color-mix(in srgb, var(--color-base-content) 10%, transparent)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: any, name: any) => [
              value ?? 0,
              statuses.find((s) => s.code === String(name))?.name ?? name,
            ] as any}
          />
          <Legend
            formatter={(value: any) =>
              statuses.find((s) => s.code === value)?.name ?? value
            }
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "color-mix(in srgb, var(--color-base-content) 60%, transparent)" }}
          />
          {statuses.map((s, i) => (
            <Area
              key={s.code}
              type="monotone"
              dataKey={s.code}
              stackId="1"
              stroke={colorFor(i)}
              fill={`url(#cfd-grad-${s.code})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Bottleneck hint */}
      <BottleneckHint data={data} />
    </div>
  );
}

// ── Bottleneck detection ─────────────────────────────────────────────────────

function BottleneckHint({ data }: { data: CfdData }) {
  if (data.data.length < 2) return null;

  const last = data.data[data.data.length - 1];
  const first = data.data[0];
  const bottleneck = data.statuses.find(
    (s) =>
      s.code !== "done" &&
      (last.counts[s.code] ?? 0) > (first.counts[s.code] ?? 0) * 1.5 &&
      (last.counts[s.code] ?? 0) > 2
  );

  if (!bottleneck) return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: "8px 14px",
        background: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
        borderRadius: 8,
        borderLeft: "3px solid var(--color-warning)",
        fontSize: 12,
        color: "var(--color-warning)",
      }}
    >
      Possible bottleneck: tasks in &laquo;{bottleneck.name}&raquo; are
      growing faster than other columns.
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-base-content) 6%, transparent)",
  border: "1px solid color-mix(in srgb, var(--color-base-content) 10%, transparent)",
  borderRadius: 8,
  padding: "6px 10px",
  color: "var(--color-base-content)",
  fontSize: 12,
};

function CFDSkeleton() {
  return (
    <div
      style={{
        height: 360,
        background: "var(--color-surface, var(--color-base-100))",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(90deg,color-mix(in srgb, var(--color-base-content) 4%, transparent) 25%,color-mix(in srgb, var(--color-base-content) 8%, transparent) 50%,color-mix(in srgb, var(--color-base-content) 4%, transparent) 75%)",
          borderRadius: 8,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function CFDError({ message }: { message: string }) {
  return (
    <div
      style={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-error)",
        fontSize: 14,
        background: "var(--color-surface, var(--color-base-100))",
        borderRadius: 16,
      }}
    >
      Error loading CFD data: {message}
    </div>
  );
}

function CFDEmpty({ message }: { message: string }) {
  return (
    <div
      style={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "color-mix(in srgb, var(--color-base-content) 50%, transparent)",
        fontSize: 14,
        background: "var(--color-surface, var(--color-base-100))",
        borderRadius: 16,
      }}
    >
      {message}
    </div>
  );
}
