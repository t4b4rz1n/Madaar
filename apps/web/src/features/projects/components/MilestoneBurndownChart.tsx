import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getMilestoneBurndown } from "../api/analyticsApi";
import type { MilestoneBurndownData } from "../types/analytics";

interface MilestoneBurndownChartProps {
  milestoneId: string;
  tz?: string;
}

export default function MilestoneBurndownChart({
  milestoneId,
  tz,
}: MilestoneBurndownChartProps) {
  const [mode, setMode] = useState<"burndown" | "burnup">("burndown");

  const resolvedTz = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ["projects", "milestone", milestoneId, "burndown", resolvedTz],
    queryFn: () => getMilestoneBurndown(milestoneId, { tz: resolvedTz }),
    staleTime: 5 * 60 * 1000,
  });

  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={"Failed to load milestone burndown data"} />;
  if (!data) return null;

  if (data.total_tasks === 0) {
    return (
      <div style={containerStyle}>
        <Header data={data} mode={mode} setMode={setMode} />
        <EmptyState message={data.note ?? "No tasks linked to this milestone."} />
      </div>
    );
  }

  // Merge all three series by date
  const dateMap: Record<
    string,
    { ideal?: number; actual?: number; done?: number; total?: number }
  > = {};
  data.ideal_line.forEach((p) => {
    dateMap[p.date] = { ...dateMap[p.date], ideal: p.remaining };
  });
  data.actual_burndown.forEach((p) => {
    dateMap[p.date] = { ...dateMap[p.date], actual: p.remaining };
  });
  data.burnup.forEach((p) => {
    dateMap[p.date] = {
      ...dateMap[p.date],
      done: p.done,
      total: p.total,
    };
  });
  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  const today = new Date().toISOString().slice(0, 10);
  const isDone = data.milestone.status === "completed";
  const isLate =
    !isDone &&
    new Date(data.milestone.target_date) < new Date() &&
    (data.actual_burndown.at(-1)?.remaining ?? 0) > 0;

  return (
    <div style={containerStyle}>
      <Header data={data} mode={mode} setMode={setMode} />

      {/* Stats Row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <StatBadge
          label="Total Tasks"
          value={String(data.total_tasks)}
          color="#6366f1"
        />
        <StatBadge
          label="Done"
          value={String(data.burnup.at(-1)?.done ?? 0)}
          color="#10b981"
        />
        <StatBadge
          label="Remaining"
          value={String(data.actual_burndown.at(-1)?.remaining ?? 0)}
          color={isLate ? "#ef4444" : "#f59e0b"}
        />
        {isLate && (
          <StatBadge label="Status" value="Delayed ⚠️" color="#ef4444" />
        )}
        {isDone && (
          <StatBadge label="Status" value="Completed ✅" color="#10b981" />
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {mode === "burndown" ? (
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={shortDate}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={32}
            />
            <Tooltip content={<BurndownTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            />
            {/* Deadline reference line */}
            <ReferenceLine
              x={data.milestone.target_date}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{
                value: "Deadline",
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 11,
              }}
            />
            {/* Today line */}
            {today >= (data.start_date ?? today) && (
              <ReferenceLine
                x={today}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                label={{
                  value: "Today",
                  position: "insideTopLeft",
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal Line"
              stroke="#64748b"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Remaining"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#6366f1" }}
            />
          </LineChart>
        ) : (
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={shortDate}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={32}
            />
            <Tooltip content={<BurnupTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            />
            <ReferenceLine
              x={data.milestone.target_date}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{
                value: "Deadline",
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total Tasks"
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="done"
              name="Done Tasks"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#10b981" }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({
  data,
  mode,
  setMode,
}: {
  data: MilestoneBurndownData;
  mode: "burndown" | "burnup";
  setMode: (m: "burndown" | "burnup") => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#e2e8f0",
          }}
        >
          {data.milestone.title}
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
          {data.start_date} → {data.target_date}
        </p>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {(["burndown", "burnup"] as const).map((m) => (
          <button
            key={m}
            id={`milestone-${m}-btn`}
            onClick={() => setMode(m)}
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontSize: 12,
              background: mode === m ? "#6366f1" : "rgba(255,255,255,0.05)",
              color: mode === m ? "#fff" : "#94a3b8",
              transition: "all 0.2s",
            }}
          >
            {m === "burndown" ? "Burndown" : "Burnup"}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 10,
        padding: "8px 14px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const BurndownTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1e1e2e",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
      }}
    >
      <p style={{ margin: "0 0 6px", color: "#94a3b8" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: "2px 0", color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

const BurnupTooltip = BurndownTooltip;

const containerStyle: React.CSSProperties = {
  background: "var(--color-surface, #1e1e2e)",
  borderRadius: 16,
  padding: "24px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};

function Skeleton() {
  return (
    <div style={{ ...containerStyle, height: 360, opacity: 0.5 }}>
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 8,
          height: "100%",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        ...containerStyle,
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ef4444",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

const shortDate = (v: string) => {
  const d = new Date(v);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
