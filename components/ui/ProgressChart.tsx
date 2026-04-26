"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type SnapshotPoint = { date: string; totalUnlocked: number };

export function ProgressChart({ data }: { data: SnapshotPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-zinc-500">
        Visit the dashboard on more days to build a progress history.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#1e2330" strokeDasharray="4 4" />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "#141720",
              border: "1px solid #1e2330",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey="totalUnlocked"
            stroke="#00b4d8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f4c542" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
