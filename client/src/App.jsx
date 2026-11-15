import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Lock,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Invoices from './pages/Invoices';
import { authApi } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'invoices'
  const [currentUser, setCurrentUser] = useState(authApi.getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Check if token exists on start
    const token = authApi.getToken();
    if (token && !currentUser) {
      authApi.getProfile()
        .then((res) => {
          if (res.user) setCurrentUser(res.user);
        })
        .catch(() => {
          authApi.logout();
          setCurrentUser(null);
        });
    }
  }, [currentUser]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      let res;
      if (authMode === 'login') {
        res = await authApi.login({ email: authForm.email, password: authForm.password });
      } else {
        res = await authApi.register(authForm);
      }
      if (res?.user) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
        setAuthForm({ name: '', email: '', password: '' });
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo & Navigation Tabs */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                    B2B
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 tracking-tight text-base">
                      FinTrack
                    </span>
                    <span className="text-2xs uppercase tracking-wider text-indigo-600 font-bold ml-1.5 px-1.5 py-0.5 bg-indigo-50 rounded">
                      Pro
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'dashboard'
                        ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'transactions'
                        ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    Transactions
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('invoices')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
                      activeTab === 'invoices'
                        ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Invoices
                  </button>
                </div>
              </div>

              {/* User Account / Auth Status */}
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                        {currentUser.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Log Out"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="flex sm:hidden items-center justify-around py-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1 py-1 px-2.5 rounded-md ${
                  activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1 py-1 px-2.5 rounded-md ${
                  activeTab === 'transactions' ? 'text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Transactions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className={`flex items-center gap-1 py-1 px-2.5 rounded-md ${
                  activeTab === 'invoices' ? 'text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Invoices
              </button>
            </div>
          </div>
        </nav>

        {/* Main View Router */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'invoices' && <Invoices />}
        </main>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 relative">
              <div className="text-center mb-5">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {authMode === 'login' ? 'Account Sign In' : 'Create an Account'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Access your B2B financial workspace securely
                </p>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-lg mb-4">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                {authMode === 'register' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition mt-2 disabled:opacity-50"
                >
                  {authLoading
                    ? 'Processing...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-100 text-center text-2xs text-slate-500">
                {authMode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError('');
                      }}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Register here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                      }}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
