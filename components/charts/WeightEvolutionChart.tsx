'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface WeightData {
  date: string
  weight: number
  bodyFat?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {entry.value} {entry.dataKey === 'weight' ? 'kg' : '%'}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function WeightEvolutionChart({ data }: { data: WeightData[] }) {
  const hasBodyFat = data.some((d) => d.bodyFat !== undefined)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis
          yAxisId="weight"
          domain={['auto', 'auto']}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `${v}kg`}
        />
        {hasBodyFat && (
          <YAxis
            yAxisId="fat"
            orientation="right"
            domain={[0, 40]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
          />
        )}
        <Tooltip content={<CustomTooltip />} />
        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weight"
          name="Peso"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ fill: '#6366f1', r: 3 }}
          activeDot={{ r: 5 }}
        />
        {hasBodyFat && (
          <Line
            yAxisId="fat"
            type="monotone"
            dataKey="bodyFat"
            name="% Grasa"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ fill: '#f97316', r: 3 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
