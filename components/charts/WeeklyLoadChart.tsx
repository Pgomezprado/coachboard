'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyLoadData {
  week: string
  volume: number   // kg total (sets × reps × weight)
  avgRpe: number   // average RPE
}

interface WeeklyLoadChartProps {
  data: WeeklyLoadData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Volumen' ? `${entry.value.toLocaleString()} kg` : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function WeeklyLoadChart({ data }: WeeklyLoadChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 10]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
        />
        <Bar yAxisId="left" dataKey="volume" name="Volumen" fill="#10b981" opacity={0.8} radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgRpe"
          name="RPE prom."
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
