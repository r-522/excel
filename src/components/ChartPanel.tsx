'use client';
// Floating draggable chart panel using Recharts

import React, { useState, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { X, GripHorizontal } from 'lucide-react';
import { useWorkbook } from '@/hooks/useWorkbook';
import { ChartConfig } from '@/types';
import { colIndexToLetter } from '@/lib/utils';

const COLORS = ['#217346', '#0078d4', '#d13438', '#ff8c00', '#8764b8', '#00b7c3'];

interface ChartPanelProps {
  chart: ChartConfig;
}

function buildChartData(chart: ChartConfig, cells: (import('@/types').CellData | undefined)[][]): object[] {
  const { start, end } = chart.dataRange;
  const data: Record<string, string | number>[] = [];

  for (let r = start.row; r <= end.row; r++) {
    const row: Record<string, string | number> = {};
    for (let c = start.col; c <= end.col; c++) {
      const cell = cells[r]?.[c];
      const val = cell?.displayValue ?? String(cell?.value ?? '');
      const key = r === start.row ? 'label' : colIndexToLetter(c);
      row[key] = isNaN(Number(val)) || val === '' ? val : Number(val);
    }
    data.push(row);
  }
  return data;
}

export default function ChartPanel({ chart }: ChartPanelProps) {
  const { activeSheet, dispatch } = useWorkbook();
  const [pos, setPos] = useState({ x: chart.position.x, y: chart.position.y });
  const [size] = useState({ w: chart.size.w, h: chart.size.h });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const panelRef = useRef<HTMLDivElement>(null);

  const data = activeSheet ? buildChartData(chart, activeSheet.cells) : [];

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.posX + ev.clientX - dragRef.current.startX,
        y: dragRef.current.posY + ev.clientY - dragRef.current.startY,
      });
    };
    const handleUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      dispatch({ type: 'UPDATE_CHART', payload: { id: chart.id, config: { position: posRef.current } } });
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const colKeys = data[0] ? Object.keys(data[0]).filter((k) => k !== 'label') : [];

  return (
    <div
      ref={panelRef}
      className="absolute z-10 rounded border border-gray-300 bg-white shadow-lg"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h + 60 }}
    >
      <div
        className="flex items-center justify-between border-b border-gray-200 px-2 py-1 cursor-move bg-gray-50 rounded-t"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className="h-3 w-3 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{chart.title || 'Chart'}</span>
        </div>
        <button onClick={() => dispatch({ type: 'REMOVE_CHART', payload: chart.id })} className="hover:text-red-500">
          <X className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>

      <div style={{ height: size.h, padding: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              {colKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          ) : chart.type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              {colKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={data} dataKey={colKeys[0] ?? 'value'} nameKey="label" cx="50%" cy="50%">
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
