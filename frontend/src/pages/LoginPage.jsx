import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ActionProgressButton from '../components/ui/ActionProgressButton';
import { LoadingProgress } from '../components/ui/LoadingStates';

const signals = [
  { label: 'Van hanh', value: 'Online', icon: Activity, tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
  { label: 'Bao mat', value: 'RBAC', icon: ShieldCheck, tone: 'text-indigo-600 bg-indigo-50 ring-indigo-100' },
  { label: 'Du lieu', value: 'Live', icon: CalendarCheck, tone: 'text-cyan-600 bg-cyan-50 ring-cyan-100' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui long nhap ten dang nhap');
      return;
    }
    if (!password) {
      setError('Vui long nhap mat khau');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error?.message || 'Dang nhap that bai');
    }
  };

  return (
    <main className="min-h-svh bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_52%,#ecfeff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
          <div className="min-w-0 rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-primary-500/25">
                <BookOpen size={28} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-primary-600">EduFlow V2</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">EduManager</h1>
              </div>
            </div>

            <div className="mt-8 max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Trung tam dieu hanh</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Dang nhap de tiep tuc van hanh trung tam.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Quan ly hoc vien, diem danh, hoc phi, phieu thu va bao cao trong mot khong gian lam viec thong nhat.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {signals.map((signal) => {
                const SignalIcon = signal.icon;
                return (
                  <div key={signal.label} className="rounded-2xl border border-slate-200/75 bg-white p-4 shadow-sm">
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${signal.tone}`}>
                      <SignalIcon size={19} aria-hidden="true" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{signal.label}</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{signal.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              He thong dang san sang tiep nhan phien lam viec.
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Secure access</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Dang nhap</h2>
              <p className="mt-2 text-sm text-slate-500">Phien lam viec se duoc gan voi vai tro va quyen hien tai.</p>
            </div>

            {loading && <LoadingProgress label="Dang xac thuc tai khoan..." className="mb-4" />}

            {error && (
              <div
                className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-bold text-slate-700">
                  Ten dang nhap
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Nhap ten dang nhap"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                  Mat khau
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Nhap mat khau"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <ActionProgressButton
                type="submit"
                loading={loading}
                loadingLabel="Đang đăng nhập..."
                className="btn-primary min-h-12 w-full"
              >
                Đăng nhập
              </ActionProgressButton>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 shrink-0 text-slate-400" size={18} aria-hidden="true" />
                <p>Chi nguoi dung duoc cap quyen moi co the truy cap du lieu van hanh.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
