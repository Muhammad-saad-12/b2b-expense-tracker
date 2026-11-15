import { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#06b6d4', // Cyan
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: payload[0].payload.fill }}
          />
          <span className="font-semibold text-slate-200">{data.category}</span>
        </div>
        <div className="text-white font-bold text-sm">
          ${Number(data.value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        {data.percent !== undefined && (
          <div className="text-slate-400 text-2xs">
            {(data.percent * 100).toFixed(1)}% of total
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function CategoryPieChart({ data = [], loading = false }) {
  const [filterType, setFilterType] = useState('expenses'); // 'expenses' | 'all'

  // Prepare data: if item has expenses/income breakdown, use it based on filter
  const processedData = (data || [])
    .map((item) => {
      let value = 0;
      if (filterType === 'expenses') {
        value = Number(item.expenses !== undefined ? item.expenses : item.totalAmount || 0);
      } else {
        value = Number(item.totalAmount || 0);
      }
      return {
        category: item.category || 'Other',
        value,
        count: item.count || 1,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = processedData.reduce((acc, curr) => acc + curr.value, 0);

  // Add percentage
  const chartData = processedData.map((item, idx) => ({
    ...item,
    percent: totalValue > 0 ? item.value / totalValue : 0,
    fill: COLORS[idx % COLORS.length],
  }));

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm h-80 flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-slate-200 rounded w-36"></div>
          <div className="h-7 bg-slate-100 rounded w-20"></div>
        </div>
        <div className="h-52 bg-slate-100 rounded-full w-52 mx-auto"></div>
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Category Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Distribution across expenditure types
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center self-start sm:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('expenses')}
            className={`px-2.5 py-1 font-medium rounded-md transition ${
              filterType === 'expenses'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 font-medium rounded-md transition ${
              filterType === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Volume
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
          <PieIcon className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">No category data</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Categorized transactions will appear in this breakdown.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Doughnut Chart */}
          <div className="md:col-span-6 h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside doughnut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">
                Total
              </span>
              <span className="text-sm font-bold text-slate-800">
                ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Category List / Legends */}
          <div className="md:col-span-6 space-y-2 max-h-56 overflow-y-auto pr-1">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium text-slate-700 truncate">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900">
                    ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-2xs text-slate-400 font-mono w-10 text-right">
                    {(item.percent * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
