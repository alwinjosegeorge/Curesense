import React from 'react';
import { VitalRecord } from '@/data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VitalsChartProps {
  vitals: VitalRecord[];
  type: 'bp' | 'sugar' | 'temperature' | 'oxygen' | 'heartRate';
}

const chartConfig: Record<string, { label: string; color: string; unit: string }> = {
  bp: { label: 'Blood Pressure', color: 'hsl(213, 56%, 40%)', unit: 'mmHg' },
  sugar: { label: 'Blood Sugar', color: 'hsl(38, 92%, 50%)', unit: 'mg/dL' },
  temperature: { label: 'Temperature', color: 'hsl(0, 72%, 51%)', unit: '°F' },
  oxygen: { label: 'Oxygen Saturation', color: 'hsl(174, 62%, 40%)', unit: '%' },
  heartRate: { label: 'Heart Rate', color: 'hsl(280, 60%, 50%)', unit: 'bpm' },
};

export default function VitalsChart({ vitals, type }: VitalsChartProps) {
  const config = chartConfig[type];

  const data = vitals.map(v => ({
    time: v.timestamp.split(' ')[1],
    ...(type === 'bp'
      ? { Systolic: v.bp.systolic, Diastolic: v.bp.diastolic }
      : { [config.label]: v[type as keyof Omit<VitalRecord, 'timestamp' | 'bp'>] }),
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-card">
      <h4 className="text-sm font-semibold text-card-foreground mb-3">{config.label}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 50%)" />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(214, 20%, 90%)', fontSize: 12 }} />
          {type === 'bp' ? (
            <>
              <Line type="monotone" dataKey="Systolic" stroke={config.color} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Diastolic" stroke="hsl(213, 56%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
              <Legend />
            </>
          ) : (
            <Line type="monotone" dataKey={config.label} stroke={config.color} strokeWidth={2} dot={{ r: 3 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
