import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  FileText,
  Trash2,
  CheckCircle2,
  Send,
  AlertCircle,
  Calendar,
  X,
  Clock,
} from 'lucide-react';
import { invoiceApi } from '../services/api';

const STATUS_BADGES = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Sent: 'bg-blue-50 text-blue-700 border-blue-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // New Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Draft',
    items: [{ description: '', quantity: 1, price: '' }],
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await invoiceApi.getAll(params);
      setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await invoiceApi.update(id, { status: newStatus });
      if (res.invoice) {
        setInvoices((prev) => prev.map((inv) => (inv._id === id ? res.invoice : inv)));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoiceApi.delete(id);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  // Line item helpers
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: '' }],
    }));
  };

  const removeItem = (idx) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const totalCalculated = formData.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: formData.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
        })),
        totalAmount: Number(totalCalculated.toFixed(2)),
      };

      const res = await invoiceApi.create(payload);
      if (res.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setIsModalOpen(false);
        setFormData({
          clientName: '',
          clientEmail: '',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Draft',
          items: [{ description: '', quantity: 1, price: '' }],
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">B2B Invoices</h2>
          <p className="text-xs text-slate-500">
            Generate, track, and reconcile accounts receivable
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Status Filter Badges */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
        {['', 'Draft', 'Sent', 'Paid', 'Overdue'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              statusFilter === status
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {status === '' ? 'All Invoices' : status}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={fetchInvoices} className="underline font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Data Table / Loading Skeleton / Empty State */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          /* Loading Skeleton */
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-48 mb-6"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-36"></div>
                  <div className="h-3 bg-slate-100 rounded w-28"></div>
                </div>
                <div className="h-6 bg-slate-100 rounded-full w-20"></div>
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="h-5 bg-slate-200 rounded w-24"></div>
                <div className="h-6 bg-slate-100 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          /* Empty State Illustration */
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              No invoices found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {statusFilter
                ? `There are no invoices matching the "${statusFilter}" status filter.`
                : 'Create billing statements and track your client receivables effortlessly.'}
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
          </div>
        ) : (
          /* Invoices Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Update Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const dueDateFormatted = inv.dueDate
                    ? new Date(inv.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  const badgeClass = STATUS_BADGES[inv.status] || STATUS_BADGES.Draft;

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{inv.clientName}</div>
                        {inv.clientEmail && (
                          <div className="text-slate-400 text-2xs">{inv.clientEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-semibold border ${badgeClass}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {dueDateFormatted}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {inv.items?.length || 0} line {inv.items?.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold font-mono text-sm text-slate-900">
                        ${Number(inv.totalAmount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          {inv.status !== 'Sent' && inv.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(inv._id, 'Sent')}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-2xs font-semibold transition"
                            >
                              Mark Sent
                            </button>
                          )}
                          {inv.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(inv._id, 'Paid')}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-2xs font-semibold transition"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(inv._id)}
                          title="Delete invoice"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">New Invoice</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme International"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Client Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@acme.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">Invoice Items *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        required
                        placeholder="Description..."
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-center"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => updateItem(idx, 'price', e.target.value)}
                        className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-right"
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-3 font-semibold">
                  <span className="text-slate-600">Calculated Total:</span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    ${totalCalculated.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
