import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Calendar,
  PlusCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { transactionApi, invoiceApi, exportApi } from '../services/api';
import SummaryCards from '../components/SummaryCards';
import ExpenseChart from '../components/ExpenseChart';
import CategoryPieChart from '../components/CategoryPieChart';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState(null);

  const [analytics, setAnalytics] = useState({
    summary: { totalIncome: 0, totalExpenses: 0, netBalance: 0, transactionCount: 0 },
    categoryBreakdown: [],
    monthlyTrends: [],
  });

  const [invoiceStats, setInvoiceStats] = useState({
    totalInvoices: 0,
    activeInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const analyticsParams = selectedYear ? { year: selectedYear } : {};

      // Fetch analytics, invoices, and recent transactions in parallel
      const [analyticsRes, invoicesRes, transactionsRes] = await Promise.allSettled([
        transactionApi.getAnalytics(analyticsParams),
        invoiceApi.getAll(),
        transactionApi.getAll(),
      ]);

      // Process Analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        const val = analyticsRes.value;
        setAnalytics({
          summary: val.summary || {
            totalIncome: 0,
            totalExpenses: 0,
            netBalance: 0,
            transactionCount: 0,
          },
          categoryBreakdown: val.categoryBreakdown || [],
          monthlyTrends: val.monthlyTrends || [],
        });
      } else if (analyticsRes.status === 'rejected') {
        console.warn('Analytics fetch note:', analyticsRes.reason?.message);
      }

      // Process Invoices
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.invoices) {
        const invList = invoicesRes.value.invoices;
        const active = invList.filter((inv) => ['Draft', 'Sent'].includes(inv.status)).length;
        const paid = invList.filter((inv) => inv.status === 'Paid').length;
        const overdue = invList.filter((inv) => inv.status === 'Overdue').length;

        setInvoiceStats({
          totalInvoices: invList.length,
          activeInvoices: active,
          paidInvoices: paid,
          overdueInvoices: overdue,
        });
      }

      // Process Recent Transactions (top 5)
      if (transactionsRes.status === 'fulfilled' && transactionsRes.value?.transactions) {
        setRecentTransactions(transactionsRes.value.transactions.slice(0, 5));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { label: 'All Time', value: '' },
    { label: `${currentYear}`, value: `${currentYear}` },
    { label: `${currentYear - 1}`, value: `${currentYear - 1}` },
  ];

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      await exportApi.downloadCSV(selectedYear ? { year: selectedYear } : {});
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export CSV. Please ensure you are logged in.');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await exportApi.downloadPDF(selectedYear ? { year: selectedYear } : {});
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please ensure you are logged in.');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              B2B
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Expense & Financial Tracker
              </h1>
              <p className="text-2xs text-slate-500 font-medium hidden sm:block">
                Overview & Cash Flow Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none text-slate-700 font-medium focus:outline-none cursor-pointer text-xs"
              >
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={exportingCSV}
                title="Export transactions as CSV"
                className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">{exportingCSV ? 'Exporting...' : 'CSV'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exportingPDF}
                title="Export financial report as PDF"
                className="flex items-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden md:inline">{exportingPDF ? 'Generating...' : 'PDF'}</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Unable to fetch live data</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => fetchDashboardData(true)}
              className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Summary Cards Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Key Metrics
            </h2>
          </div>
          <SummaryCards
            summary={analytics.summary}
            invoiceStats={invoiceStats}
            loading={loading}
          />
        </section>

        {/* 2. Visual Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ExpenseChart data={analytics.monthlyTrends} loading={loading} />
          </div>
          <div className="lg:col-span-5">
            <CategoryPieChart
              data={analytics.categoryBreakdown}
              loading={loading}
            />
          </div>
        </section>

        {/* 3. Recent Activity Section */}
        <section className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500">
                Latest income and expense records
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-12 bg-slate-100 rounded-lg w-full"></div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No transactions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Once transactions are added through the API or transactions view, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Vendor / Client</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const formattedDate = tx.date
                      ? new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <tr key={tx._id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold capitalize ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {tx.category}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {tx.vendorOrClient || '—'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold font-mono ${
                            isIncome ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'}$
                          {Number(tx.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
