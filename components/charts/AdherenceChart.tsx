'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AdherenceData {
  week: string
  planned: number
  completed: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const planned = payload.find((p: any) => p.dataKey === 'planned')?.value ?? 0
    const completed = payload.find((p: any) => p.dataKey === 'completed')?.value ?? 0
    const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
        <p className="text-slate-300 font-medium mb-1">{label}</p>
        <p className="text-slate-400">Planificadas: {planned}</p>
        <p className="text-emerald-400">Completadas: {completed}</p>
        <p className="text-blue-400 font-semibold mt-1">Adherencia: {pct}%</p>
      </div>
    )
  }
  return null
}

export default function AdherenceChart({ data }: { data: AdherenceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Bar dataKey="planned" name="Planificadas" fill="#475569" radius={[3, 3, 0, 0]} />
        <Bar dataKey="completed" name="Completadas" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
