"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

export function DailySummaryChart({ data }: { data: any[] }) {
  return (
    <div className="h-72 w-full"> {/* ความสูง fix ป้องกันเตือน */}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="clicks" fill="#6366F1" />
          <Bar dataKey="conversions" fill="#10B981" />
          <Bar dataKey="spend" fill="#111827" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
