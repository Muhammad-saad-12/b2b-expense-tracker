import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3, LineChart as LineIcon } from 'lucide-react';

const formatMonthLabel = (periodStr, month, year) => {
  if (!periodStr && !month) return '';
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  if (month && month >= 1 && month <= 12) {
    return `${monthNames[month - 1]} ${year ? `'${String(year).slice(-2)}` : ''}`;
  }
  if (periodStr && periodStr.includes('-')) {
    const parts = periodStr.split('-');
    const m = parseInt(parts[1], 10);
    const y = parts[0];
    if (m >= 1 && m <= 12) {
      return `${monthNames[m - 1]} '${y.slice(-2)}`;
    }
  }
  return periodStr || '';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5">
        <p className="font-semibold text-slate-300 pb-1 border-b border-slate-700">
          {label}
        </p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}:
            </span>
            <span className="font-bold text-white">
              ${Number(item.value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ExpenseChart({ data = [], loading = false }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'

  // Format chart data
  const chartData = (data || []).map((item) => ({
    ...item,
    formattedMonth: formatMonthLabel(item.period, item.month, item.year),
    income: Number(item.totalIncome ?? item.income ?? 0),
    expenses: Number(item.totalExpenses ?? item.expenses ?? 0),
    net: Number(item.netBalance ?? item.net ?? 0),
  }));

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm h-80 flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-slate-200 rounded w-44"></div>
          <div className="h-8 bg-slate-100 rounded w-24"></div>
        </div>
        <div className="h-52 bg-slate-100 rounded-lg w-full"></div>
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Monthly Cash Flow & Trends
          </h3>
          <p className="text-xs text-slate-500">
            Income vs. Expenses breakdown over time
          </p>
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center self-start sm:self-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              chartType === 'bar'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Bars
          </button>
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
              chartType === 'line'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            Lines
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
          <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">No trend data available</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Add income and expense transactions to see your monthly financial patterns.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="formattedMonth"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 16, fontSize: 12 }}
              />

              {chartType === 'bar' ? (
                <>
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Flow"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f43f5e' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Flow"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
