import { TrendingUp, TrendingDown, Wallet, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function SummaryCards({ summary, invoiceStats, loading = false }) {
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const totalIncome = summary?.totalIncome || 0;
  const totalExpenses = summary?.totalExpenses || 0;
  const netBalance = summary?.netBalance !== undefined ? summary.netBalance : (totalIncome - totalExpenses);
  const activeInvoicesCount = invoiceStats?.activeInvoices ?? 0;
  const totalInvoicesCount = invoiceStats?.totalInvoices ?? 0;

  const cards = [
    {
      title: 'Total Income',
      value: formatCurrency(totalIncome),
      subtext: `${summary?.transactionCount || 0} total transactions`,
      icon: TrendingUp,
      badgeIcon: ArrowUpRight,
      color: 'emerald',
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      subtext: 'Outflow spending',
      icon: TrendingDown,
      badgeIcon: ArrowDownRight,
      color: 'rose',
      bgLight: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBg: 'bg-rose-500 text-white',
      badgeBg: 'bg-rose-100 text-rose-800',
    },
    {
      title: 'Net Balance',
      value: formatCurrency(netBalance),
      subtext: netBalance >= 0 ? 'Positive cash flow' : 'Deficit cash flow',
      icon: Wallet,
      color: netBalance >= 0 ? 'indigo' : 'amber',
      bgLight: netBalance >= 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: netBalance >= 0 ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white',
      badgeBg: netBalance >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Active Invoices',
      value: activeInvoicesCount.toString(),
      subtext: `${totalInvoicesCount} total invoices on file`,
      icon: FileText,
      color: 'amber',
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-100 text-amber-800',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="h-10 w-10 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-8 bg-slate-200 rounded w-32"></div>
            <div className="h-3 bg-slate-100 rounded w-28"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{card.title}</span>
              <div className={`p-2.5 rounded-lg ${card.iconBg} shadow-sm`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {card.value}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
