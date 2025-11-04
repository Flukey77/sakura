"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function DailySummaryChart({ data }: { data: Array<{ name: string; spend: number; clicks: number; conversions: number; }> }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="spend" fill="#111827" name="Spend" />
          <Bar dataKey="clicks" fill="#6366f1" name="Clicks" />
          <Bar dataKey="conversions" fill="#14b8a6" name="Conversions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
