import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BatteryCharging,
  Bot,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileBarChart,
  Gauge,
  Home,
  Leaf,
  Map,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Square,
  Sun,
  Trash2,
  Upload
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { AIInput, Field, Role, SensorReading, Settings, Survey, User } from './types';
import { computeField, generateAIRecommendation, uid } from './lib/calculations';
import { db } from './lib/db';
import { useClock, useLiveQuery, useOnlineStatus } from './lib/hooks';
import { getLiveReading } from './services/rover';
import { pendingSyncCount, syncNow } from './services/sync';
import { exportBackup, restoreBackup } from './services/backup';
import { exportCSV, exportPDF } from './services/export';

type Page = 'dashboard' | 'fields' | 'survey' | 'map' | 'ai' | 'reports' | 'settings';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'fields', label: 'Fields', icon: Leaf },
  { id: 'survey', label: 'Survey', icon: Activity },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'ai', label: 'AI Analysis', icon: Bot },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
] as const;

export default function App() {
  const users = useLiveQuery(() => db.users.toArray(), []);
  const fields = useLiveQuery(() => db.fields.orderBy('updatedAt').reverse().toArray(), []);
  const surveys = useLiveQuery(() => db.surveys.orderBy('startedAt').reverse().toArray(), []);
  const readings = useLiveQuery(() => db.readings.orderBy('time').reverse().toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('settings'), undefined as Settings | undefined);
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().limit(3).toArray(), []);
  const [page, setPage] = useState<Page>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const online = useOnlineStatus();

  useEffect(() => {
    if (currentUser || !users.length) return;
    const saved = localStorage.getItem('agrisense-user-id');
    const savedUser = users.find((item) => item.id === saved);
    if (savedUser) setCurrentUser(savedUser);
  }, [users, currentUser]);

  useEffect(() => {
    pendingSyncCount().then(setPending);
  }, [fields, surveys, readings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(settings?.darkMode));
  }, [settings?.darkMode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'n') setPage('survey');
      if (event.altKey && event.key.toLowerCase() === 'f') setPage('fields');
      if (event.altKey && event.key.toLowerCase() === 'd') setPage('dashboard');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeField = fields[0];
  const latestReadings = readings.slice(0, 24).reverse();
  const avgHealth = Math.round(readings.reduce((sum, item) => sum + item.soilHealth, 0) / Math.max(readings.length, 1));
  const todaySurveys = surveys.filter((survey) => new Date(survey.startedAt).toDateString() === new Date().toDateString()).length;
  const latestSurvey = surveys[0];

  if (!users.length) return <LoadingScreen />;
  if (!currentUser) return <LoginScreen users={users} onLogin={(user) => {
    localStorage.setItem('agrisense-user-id', user.id);
    setCurrentUser(user);
  }} settings={settings} />;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5faf5] text-slate-950 transition-colors dark:bg-[#08120b] dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(102,187,106,.26),transparent_28%),radial-gradient(circle_at_88%_2%,rgba(46,125,50,.20),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(236,249,236,.9))] dark:bg-[radial-gradient(circle_at_15%_10%,rgba(102,187,106,.14),transparent_28%),radial-gradient(circle_at_88%_2%,rgba(46,125,50,.18),transparent_26%),linear-gradient(135deg,#08120b,#132016)]" />
      <Sidebar page={page} setPage={setPage} open={menuOpen} close={() => setMenuOpen(false)} />
      <main className="min-h-screen lg:pl-72">
        <Topbar
          page={page}
          user={currentUser}
          users={users}
          setUser={(user) => {
            localStorage.setItem('agrisense-user-id', user.id);
            setCurrentUser(user);
          }}
          online={online}
          pending={pending}
          openMenu={() => setMenuOpen(true)}
          settings={settings}
        />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.section
              key={page}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {page === 'dashboard' && (
                <Dashboard
                  todaySurveys={todaySurveys}
                  fields={fields}
                  avgHealth={avgHealth}
                  latestSurvey={latestSurvey}
                  latestReadings={latestReadings}
                  pending={pending}
                  online={online}
                  setPage={setPage}
                  notifications={notifications}
                />
              )}
              {page === 'fields' && <Fields fields={fields} />}
              {page === 'survey' && <SurveyPage fields={fields} readings={readings} />}
              {page === 'map' && <MapPage fields={fields} readings={readings} activeField={activeField} />}
              {page === 'ai' && <AIPage fields={fields} readings={readings} />}
              {page === 'reports' && <Reports fields={fields} surveys={surveys} readings={readings} />}
              {page === 'settings' && <SettingsPage settings={settings} online={online} pending={pending} refreshPending={() => pendingSyncCount().then(setPending)} />}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function LoginScreen({ users, onLogin, settings }: { users: User[]; onLogin: (user: User) => void; settings?: Settings }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(settings?.darkMode));
  }, [settings?.darkMode]);
  return (
    <div className="min-h-screen bg-[#f5faf5] px-4 py-10 text-slate-950 dark:bg-[#08120b] dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(102,187,106,.28),transparent_28%),linear-gradient(135deg,rgba(255,255,255,.95),rgba(230,247,231,.92))] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(102,187,106,.14),transparent_28%),linear-gradient(135deg,#08120b,#132016)]" />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass w-full rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-4 grid size-14 place-items-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/25">
                <Leaf />
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Local Authentication</p>
              <h1 className="mt-2 text-4xl font-bold">AgriSense AI Rover</h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Choose a local role profile. Authentication works fully offline and stores only a local session reference on this device.</p>
            </div>
            <ThemeToggle settings={settings} />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {users.map((user) => (
              <button key={user.id} onClick={() => onLogin(user)} className="rounded-[1.5rem] bg-white/70 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:bg-white/10">
                <ShieldCheck className="text-primary" />
                <p className="mt-4 text-xl font-bold">{user.role}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{user.name}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Enter workspace <ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f5faf5] dark:bg-[#08120b]">
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass flex items-center gap-3 rounded-3xl px-6 py-4">
        <Leaf className="text-primary" />
        <span className="font-semibold">Loading AgriSense offline workspace...</span>
      </motion.div>
    </div>
  );
}

function Sidebar({ page, setPage, open, close }: { page: Page; setPage: (page: Page) => void; open: boolean; close: () => void }) {
  return (
    <>
      <button aria-label="Close navigation" className={`fixed inset-0 z-30 bg-black/30 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={close} />
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/30 bg-white/70 p-4 shadow-glass backdrop-blur-2xl transition dark:border-white/10 dark:bg-white/8 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center gap-3 rounded-3xl bg-primary/10 p-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <Leaf />
          </div>
          <div>
            <p className="text-lg font-bold">AgriSense</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">AI Rover Console</p>
          </div>
        </div>
        <nav className="space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  close();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-white/10'}`}
              >
                <Icon size={19} />
                {item.label}
                {active && <ChevronRight className="ml-auto" size={17} />}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-3xl bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Offline-first</p>
          <p>All fields, samples, reports, and settings are stored locally in IndexedDB.</p>
        </div>
      </aside>
    </>
  );
}

function Topbar({ page, user, users, setUser, online, pending, openMenu, settings }: { page: Page; user: User; users: User[]; setUser: (user: User) => void; online: boolean; pending: number; openMenu: () => void; settings?: Settings }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-[#f5faf5]/75 backdrop-blur-2xl dark:border-white/10 dark:bg-[#08120b]/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button aria-label="Open navigation" onClick={openMenu} className="icon-btn lg:hidden">
            <Menu />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">AgriSense AI Rover</p>
            <h1 className="text-2xl font-bold capitalize sm:text-3xl">{nav.find((item) => item.id === page)?.label}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold sm:flex ${online ? 'bg-primary/10 text-primary' : 'bg-amber-500/15 text-amber-700 dark:text-amber-200'}`}>
            {online ? <Cloud size={16} /> : <CloudOff size={16} />}
            {online ? 'Online' : 'Offline'}
            {pending > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-black/30">{pending} pending</span>}
          </div>
          <select aria-label="Current role" className="input hidden max-w-44 sm:block" value={user.id} onChange={(event) => setUser(users.find((item) => item.id === event.target.value) ?? user)}>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.role} - {item.name}
              </option>
            ))}
          </select>
          <ThemeToggle settings={settings} />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle({ settings }: { settings?: Settings }) {
  return (
    <button
      aria-label="Toggle dark mode"
      className="icon-btn"
      onClick={() => settings && db.settings.update('settings', { darkMode: !settings.darkMode })}
    >
      {settings?.darkMode ? <Sun /> : <Moon />}
    </button>
  );
}

function Dashboard({ todaySurveys, fields, avgHealth, latestSurvey, latestReadings, pending, online, setPage, notifications }: { todaySurveys: number; fields: Field[]; avgHealth: number; latestSurvey?: Survey; latestReadings: SensorReading[]; pending: number; online: boolean; setPage: (page: Page) => void; notifications: any[] }) {
  const clock = useClock();
  const battery = latestSurvey?.batteryEnd ?? 86;
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Today's Surveys" value={todaySurveys} sub="Captured locally" />
        <MetricCard icon={Leaf} label="Total Fields" value={fields.length} sub="Unlimited field registry" />
        <MetricCard icon={Gauge} label="Average Soil Health" value={`${avgHealth || 0}%`} sub="Across saved samples" />
        <MetricCard icon={BatteryCharging} label="Battery Status" value={`${battery}%`} sub="Estimated rover charge" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="glass overflow-hidden rounded-[2rem] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-primary">Rover Status</p>
              <h2 className="mt-1 text-3xl font-bold">Ready for autonomous soil survey</h2>
              <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Mock, WiFi, and Bluetooth modes are available. Samples are auto-saved to IndexedDB even when the network is unavailable.</p>
            </div>
            <button className="primary-btn" onClick={() => setPage('survey')}>
              <Play size={18} /> Quick Start Survey
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatusPill label="Connection" value="Mock mode" tone="green" />
            <StatusPill label="Last Sync" value={pending ? `${pending} pending` : 'Up to date'} tone={pending ? 'amber' : 'green'} />
            <StatusPill label="Local Time" value={clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tone="neutral" />
          </div>
          <div className="mt-7 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latestReadings}>
                <defs>
                  <linearGradient id="health" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#66BB6A" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#66BB6A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="pointIndex" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="soilHealth" stroke="#2E7D32" fill="url(#health)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass rounded-[2rem] p-6">
            <p className="text-sm font-semibold text-primary">Network</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{online ? 'Cloud available' : 'Offline protected'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">Data remains usable without internet.</p>
              </div>
              {online ? <Cloud className="text-primary" size={34} /> : <CloudOff className="text-amber-500" size={34} />}
            </div>
          </div>
          <div className="glass rounded-[2rem] p-6">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            <div className="mt-4 space-y-3">
              {notifications.length ? notifications.map((item) => <NotificationRow key={item.id} item={item} />) : <p className="text-sm text-slate-500 dark:text-slate-300">No alerts. The rover workspace is calm.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="glass rounded-[2rem] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-300">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-300">{sub}</p>
    </motion.div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'neutral' }) {
  const styles = tone === 'green' ? 'bg-primary/10 text-primary' : tone === 'amber' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-200' : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-200';
  return (
    <div className={`rounded-2xl px-4 py-3 ${styles}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Fields({ fields }: { fields: Field[] }) {
  const [query, setQuery] = useState('');
  const filtered = fields.filter((field) => `${field.name} ${field.owner} ${field.crop}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-6">
      <FieldForm />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="input w-full pl-10" placeholder="Search fields, owners, crops" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-300">{filtered.length} fields visible</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((field) => (
          <FieldCard key={field.id} field={field} />
        ))}
      </div>
    </div>
  );
}

function FieldForm() {
  const [form, setForm] = useState({ name: '', owner: '', crop: '', length: 100, width: 60, samplingDistance: 10 });
  const estimate = computeField(form);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    await db.fields.add({ ...form, ...estimate, id: uid('field'), createdAt: now, updatedAt: now, synced: false });
    setForm({ name: '', owner: '', crop: '', length: 100, width: 60, samplingDistance: 10 });
  }
  return (
    <form onSubmit={submit} className="glass rounded-[2rem] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Plus className="text-primary" />
        <h2 className="text-xl font-bold">Create Field</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <input required className="input" placeholder="Field name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required className="input" placeholder="Owner" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
        <input required className="input" placeholder="Crop" value={form.crop} onChange={(event) => setForm({ ...form, crop: event.target.value })} />
        <NumberInput label="Length" value={form.length} onChange={(value) => setForm({ ...form, length: value })} />
        <NumberInput label="Width" value={form.width} onChange={(value) => setForm({ ...form, width: value })} />
        <NumberInput label="Distance" value={form.samplingDistance} onChange={(value) => setForm({ ...form, samplingDistance: value })} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span>Area {estimate.area.toLocaleString()} m²</span>
        <span>Points {estimate.samplingPoints}</span>
        <span>Time {estimate.estimatedSurveyTime} min</span>
        <span>Battery {estimate.estimatedBattery}%</span>
        <button className="primary-btn ml-auto" type="submit">
          <Plus size={18} /> Add Field
        </button>
      </div>
    </form>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <input aria-label={label} className="input" min={1} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

function FieldCard({ field }: { field: Field }) {
  const duplicate = async () => {
    const now = new Date().toISOString();
    await db.fields.add({ ...field, id: uid('field'), name: `${field.name} Copy`, createdAt: now, updatedAt: now, synced: false });
  };
  return (
    <motion.article whileHover={{ y: -4 }} className="glass rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">{field.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">{field.owner} · {field.crop}</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{field.area.toLocaleString()} m²</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <InfoBox label="Sampling Points" value={field.samplingPoints} />
        <InfoBox label="Survey Time" value={`${field.estimatedSurveyTime} min`} />
        <InfoBox label="Battery Need" value={`${field.estimatedBattery}%`} />
        <InfoBox label="Distance" value={`${field.samplingDistance} m`} />
      </div>
      <div className="mt-5 flex gap-2">
        <button className="secondary-btn flex-1" onClick={duplicate}>
          <Copy size={17} /> Duplicate
        </button>
        <button className="danger-btn" aria-label="Delete field" onClick={() => db.fields.delete(field.id)}>
          <Trash2 size={17} />
        </button>
      </div>
    </motion.article>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/60 p-3 dark:bg-white/10">
      <p className="text-xs text-slate-500 dark:text-slate-300">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function SurveyPage({ fields, readings }: { fields: Field[]; readings: SensorReading[] }) {
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '');
  const [survey, setSurvey] = useState<Survey | undefined>();
  const [connection, setConnection] = useState<'WiFi' | 'Bluetooth' | 'Mock'>('Mock');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const field = fields.find((item) => item.id === fieldId) ?? fields[0];
  const surveyReadings = readings.filter((item) => item.surveyId === survey?.id).sort((a, b) => a.pointIndex - b.pointIndex);
  const latest = surveyReadings.at(-1);

  useEffect(() => {
    if (!fieldId && fields[0]) setFieldId(fields[0].id);
  }, [fields, fieldId]);

  useEffect(() => {
    if (!running || !survey || !field) return;
    const interval = window.setInterval(async () => {
      setElapsed((value) => value + 3);
      const currentCount = await db.readings.where('surveyId').equals(survey.id).count();
      if (currentCount >= field.samplingPoints) {
        await db.surveys.update(survey.id, { status: 'completed', endedAt: new Date().toISOString(), sampleCount: currentCount, batteryEnd: Math.max(18, 96 - Math.round(currentCount * 0.8)) });
        setRunning(false);
        return;
      }
      const reading = await getLiveReading(field.id, survey.id, currentCount + 1);
      await db.readings.add(reading);
      await db.surveys.update(survey.id, { sampleCount: currentCount + 1, synced: false });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [running, survey, field]);

  const start = async () => {
    if (!field) return;
    const created: Survey = { id: uid('survey'), fieldId: field.id, status: 'running', startedAt: new Date().toISOString(), sampleCount: 0, batteryStart: 96, connection, synced: false };
    await db.surveys.add(created);
    setSurvey(created);
    setElapsed(0);
    setRunning(true);
  };
  const pause = async () => {
    if (!survey) return;
    setRunning(false);
    await db.surveys.update(survey.id, { status: 'paused' });
  };
  const resume = async () => {
    if (!survey) return;
    setRunning(true);
    await db.surveys.update(survey.id, { status: 'running' });
  };
  const stop = async () => {
    if (!survey) return;
    setRunning(false);
    await db.surveys.update(survey.id, { status: 'stopped', endedAt: new Date().toISOString(), batteryEnd: Math.max(20, 96 - surveyReadings.length) });
  };

  const progress = field ? Math.min(100, Math.round((surveyReadings.length / field.samplingPoints) * 100)) : 0;
  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">Survey Workflow</h2>
        <div className="mt-4 space-y-4">
          <label className="label">Select Field</label>
          <select className="input w-full" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
            {fields.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.crop}</option>
            ))}
          </select>
          <label className="label">Connect Rover</label>
          <div className="grid grid-cols-3 gap-2">
            {(['WiFi', 'Bluetooth', 'Mock'] as const).map((item) => (
              <button key={item} className={`segmented ${connection === item ? 'segmented-active' : ''}`} onClick={() => setConnection(item)}>{item}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!survey || survey.status === 'completed' || survey.status === 'stopped' ? <button className="primary-btn col-span-2" onClick={start}><Play size={18} /> Start Survey</button> : null}
            {survey && running && <button className="secondary-btn" onClick={pause}><Pause size={17} /> Pause</button>}
            {survey && !running && survey.status === 'paused' && <button className="secondary-btn" onClick={resume}><RotateCw size={17} /> Resume</button>}
            {survey && survey.status !== 'completed' && survey.status !== 'stopped' && <button className="danger-btn justify-center" onClick={stop}><Square size={17} /> Stop</button>}
          </div>
        </div>
      </div>
      <div className="glass rounded-[2rem] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Live Rover Status</p>
            <h2 className="text-2xl font-bold">{survey?.status ?? 'Not started'}</h2>
          </div>
          <StatusPill label="Timer" value={`${Math.floor(elapsed / 60)}m ${elapsed % 60}s`} tone="neutral" />
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{surveyReadings.length} / {field?.samplingPoints ?? 0} sampling points</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {latest ? <SensorGrid reading={latest} /> : <p className="col-span-full text-slate-500 dark:text-slate-300">Start a survey to stream live sensor values every 3 seconds.</p>}
        </div>
        {latest && <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">GPS {latest.gps.lat.toFixed(5)}, {latest.gps.lng.toFixed(5)} · {new Date(latest.time).toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}

function SensorGrid({ reading }: { reading: SensorReading }) {
  const items = [
    ['Nitrogen', reading.nitrogen, 'mg/kg'],
    ['Phosphorus', reading.phosphorus, 'mg/kg'],
    ['Potassium', reading.potassium, 'mg/kg'],
    ['Moisture', reading.moisture, '%'],
    ['Temperature', reading.temperature, '°C'],
    ['EC', reading.ec, 'dS/m'],
    ['pH', reading.ph, ''],
    ['Soil Health', reading.soilHealth, '%']
  ];
  return (
    <>
      {items.map(([label, value, unit]) => (
        <div key={label} className="rounded-2xl bg-white/65 p-4 dark:bg-white/10">
          <p className="text-xs text-slate-500 dark:text-slate-300">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}<span className="ml-1 text-sm font-medium text-slate-500">{unit}</span></p>
        </div>
      ))}
    </>
  );
}

type MapMetric = 'nitrogen' | 'phosphorus' | 'potassium' | 'moisture' | 'soilHealth';

function MapPage({ fields, readings, activeField }: { fields: Field[]; readings: SensorReading[]; activeField?: Field }) {
  const [fieldId, setFieldId] = useState(activeField?.id ?? '');
  const [metric, setMetric] = useState<MapMetric>('soilHealth');
  const selected = fields.find((field) => field.id === fieldId) ?? activeField;
  const points = readings.filter((item) => item.fieldId === selected?.id).sort((a, b) => a.pointIndex - b.pointIndex);
  useEffect(() => {
    if (!fieldId && activeField) setFieldId(activeField.id);
  }, [activeField, fieldId]);
  return (
    <div className="space-y-4">
      <div className="glass flex flex-col gap-3 rounded-[2rem] p-4 md:flex-row md:items-center">
        <select className="input" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
          {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
        </select>
        <select className="input" value={metric} onChange={(event) => setMetric(event.target.value as MapMetric)}>
          <option value="nitrogen">Nitrogen</option>
          <option value="phosphorus">Phosphorus</option>
          <option value="potassium">Potassium</option>
          <option value="moisture">Moisture</option>
          <option value="soilHealth">Soil Health</option>
        </select>
        <p className="text-sm text-slate-500 dark:text-slate-300">Offline field heatmap generated from saved survey samples.</p>
      </div>
      <FieldHeatmap field={selected} readings={points} metric={metric} />
    </div>
  );
}

function FieldHeatmap({ field, readings, metric }: { field?: Field; readings: SensorReading[]; metric: MapMetric }) {
  const [selected, setSelected] = useState<SensorReading | undefined>(readings[0]);
  const cols = field ? Math.max(1, Math.ceil(field.width / Math.max(field.samplingDistance, 1))) : 8;
  const rows = field ? Math.max(1, Math.ceil(field.length / Math.max(field.samplingDistance, 1))) : 6;
  const average = Math.round(readings.reduce((sum, reading) => sum + Number(reading[metric]), 0) / Math.max(readings.length, 1));

  useEffect(() => {
    setSelected(readings[0]);
  }, [field?.id, readings.length]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
      <div className="glass overflow-hidden rounded-[2rem] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{field?.name ?? 'No field selected'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {readings.length} samples · {metricLabel(metric)} average {average || 0}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
            <span className="size-3 rounded-full bg-red-500" /> Low
            <span className="size-3 rounded-full bg-amber-400" /> Medium
            <span className="size-3 rounded-full bg-accent" /> Good
            <span className="size-3 rounded-full bg-primary" /> High
          </div>
        </div>
        <div className="relative aspect-[16/10] min-h-[360px] overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(232,246,233,.95),rgba(206,235,209,.88))] p-3 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(19,32,22,.98),rgba(30,54,35,.92))]">
          <svg viewBox="0 0 100 64" role="img" aria-label="Offline survey heatmap" className="h-full w-full">
            <defs>
              <pattern id="sample-grid" width={100 / cols} height={64 / rows} patternUnits="userSpaceOnUse">
                <path d={`M ${100 / cols} 0 L 0 0 0 ${64 / rows}`} fill="none" stroke="rgba(46,125,50,.18)" strokeWidth="0.25" />
              </pattern>
              <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="rgba(15,23,42,.25)" />
              </filter>
            </defs>
            <rect x="1" y="1" width="98" height="62" rx="5" fill="url(#sample-grid)" stroke="#2E7D32" strokeWidth="0.8" />
            <path d="M8 54 C24 48 28 14 46 12 C64 10 72 22 91 14" fill="none" stroke="rgba(37,99,235,.38)" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="2 2" />
            {readings.map((reading, index) => {
              const position = samplePosition(reading, index, cols, rows);
              const value = Number(reading[metric]);
              const active = selected?.id === reading.id;
              return (
                <g key={reading.id}>
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={active ? 2.9 : 2.35}
                    fill={heatColor(value, metric)}
                    stroke={active ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={active ? 0.9 : 0.55}
                    filter="url(#marker-shadow)"
                    className="cursor-pointer transition hover:opacity-80"
                    onClick={() => setSelected(reading)}
                  >
                    <title>{`Point ${reading.pointIndex}: ${metricLabel(metric)} ${value}`}</title>
                  </circle>
                  {active && <circle cx={position.x} cy={position.y} r="4.4" fill="none" stroke="#2E7D32" strokeWidth="0.65" />}
                </g>
              );
            })}
          </svg>
          {!readings.length && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <Map className="mx-auto text-primary" size={42} />
                <p className="mt-3 text-lg font-bold">No samples for this field yet</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Start a survey and saved points will appear here automatically.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <SampleDetails reading={selected} metric={metric} field={field} />
    </div>
  );
}

function SampleDetails({ reading, metric, field }: { reading?: SensorReading; metric: MapMetric; field?: Field }) {
  if (!reading) {
    return (
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">Sample Details</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Select a point on the heatmap to inspect its complete soil reading.</p>
      </div>
    );
  }
  return (
    <aside className="glass rounded-[2rem] p-5">
      <p className="text-sm font-semibold text-primary">Point {reading.pointIndex}</p>
      <h2 className="mt-1 text-2xl font-bold">{metricLabel(metric)} {Number(reading[metric])}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{field?.name ?? 'Field'} · {new Date(reading.time).toLocaleString()}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <InfoBox label="Nitrogen" value={`${reading.nitrogen} mg/kg`} />
        <InfoBox label="Phosphorus" value={`${reading.phosphorus} mg/kg`} />
        <InfoBox label="Potassium" value={`${reading.potassium} mg/kg`} />
        <InfoBox label="Moisture" value={`${reading.moisture}%`} />
        <InfoBox label="Temperature" value={`${reading.temperature} C`} />
        <InfoBox label="EC" value={`${reading.ec} dS/m`} />
        <InfoBox label="pH" value={reading.ph} />
        <InfoBox label="Health" value={`${reading.soilHealth}%`} />
      </div>
      <div className="mt-4 rounded-2xl bg-white/60 p-3 text-sm dark:bg-white/10">
        <p className="text-xs text-slate-500 dark:text-slate-300">GPS</p>
        <p className="font-bold">{reading.gps.lat.toFixed(5)}, {reading.gps.lng.toFixed(5)}</p>
      </div>
    </aside>
  );
}

function samplePosition(reading: SensorReading, index: number, cols: number, rows: number) {
  const zeroIndex = Math.max(0, reading.pointIndex - 1 || index);
  const col = zeroIndex % cols;
  const row = Math.floor(zeroIndex / cols) % rows;
  const serpentineCol = row % 2 === 0 ? col : cols - col - 1;
  return {
    x: ((serpentineCol + 0.5) / cols) * 96 + 2,
    y: ((row + 0.5) / rows) * 60 + 2
  };
}

function metricLabel(metric: MapMetric) {
  const labels: Record<MapMetric, string> = {
    nitrogen: 'Nitrogen',
    phosphorus: 'Phosphorus',
    potassium: 'Potassium',
    moisture: 'Moisture',
    soilHealth: 'Soil Health'
  };
  return labels[metric];
}

function heatColor(value: number, metric: MapMetric) {
  const maxByMetric: Record<MapMetric, number> = {
    nitrogen: 120,
    phosphorus: 65,
    potassium: 220,
    moisture: 60,
    soilHealth: 100
  };
  const score = Math.max(0, Math.min(100, (value / maxByMetric[metric]) * 100));
  if (score > 80) return '#2E7D32';
  if (score > 55) return '#66BB6A';
  if (score > 35) return '#FBBF24';
  return '#EF4444';
}

function AIPage({ fields, readings }: { fields: Field[]; readings: SensorReading[] }) {
  const last = readings[0];
  const [input, setInput] = useState<AIInput>({
    nitrogen: last?.nitrogen ?? 68,
    phosphorus: last?.phosphorus ?? 32,
    potassium: last?.potassium ?? 118,
    moisture: last?.moisture ?? 34,
    temperature: last?.temperature ?? 27,
    ph: last?.ph ?? 6.5,
    ec: last?.ec ?? 1.2,
    crop: fields[0]?.crop ?? 'Rice'
  });
  const result = useMemo(() => generateAIRecommendation(input), [input]);
  return (
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">AI Soil Analysis</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(['nitrogen', 'phosphorus', 'potassium', 'moisture', 'temperature', 'ph', 'ec'] as const).map((key) => (
            <label key={key} className="space-y-1">
              <span className="label capitalize">{key}</span>
              <input className="input w-full" type="number" step="0.1" value={input[key]} onChange={(event) => setInput({ ...input, [key]: Number(event.target.value) })} />
            </label>
          ))}
          <label className="space-y-1 sm:col-span-2">
            <span className="label">Crop</span>
            <input className="input w-full" value={input.crop} onChange={(event) => setInput({ ...input, crop: event.target.value })} />
          </label>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ResultCard title="Soil Health Score" value={`${result.soilHealthScore}%`} body="Rule-based local inference. A REST AI endpoint can replace this when available." icon={Gauge} />
        <ResultCard title="Crop Suitability" value={result.suitability} body="Based on nutrient balance, moisture, pH, and conductivity." icon={ShieldCheck} />
        <ResultCard title="Fertilizer Recommendation" value={result.fertilizer} body="Generated offline from agronomic heuristics." icon={Leaf} />
        <ResultCard title="Nutrient Deficiency" value={result.deficiency} body="Use this as a field advisory starting point." icon={Bot} />
      </div>
    </div>
  );
}

function ResultCard({ title, value, body, icon: Icon }: { title: string; value: string; body: string; icon: any }) {
  return (
    <motion.article whileHover={{ y: -4 }} className="glass rounded-[2rem] p-5">
      <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon /></div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">{title}</p>
      <h3 className="mt-1 text-xl font-bold">{value}</h3>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{body}</p>
    </motion.article>
  );
}

function Reports({ fields, surveys, readings }: { fields: Field[]; surveys: Survey[]; readings: SensorReading[] }) {
  const [query, setQuery] = useState('');
  const selectedSurvey = surveys.find((survey) => fields.find((field) => field.id === survey.fieldId)?.name.toLowerCase().includes(query.toLowerCase())) ?? surveys[0];
  const field = fields.find((item) => item.id === selectedSurvey?.fieldId);
  const reportReadings = readings.filter((item) => item.surveyId === selectedSurvey?.id).sort((a, b) => a.pointIndex - b.pointIndex);
  return (
    <div className="space-y-6">
      <div className="glass flex flex-col gap-3 rounded-[2rem] p-4 sm:flex-row sm:items-center">
        <input className="input flex-1" placeholder="Filter reports by field name" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="secondary-btn" onClick={() => exportCSV(reportReadings)}><Download size={17} /> CSV</button>
        <button className="primary-btn" onClick={() => exportPDF(field, selectedSurvey, reportReadings)}><FileBarChart size={17} /> PDF</button>
      </div>
      <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">{field?.name ?? 'No report selected'}</h2>
          <div className="mt-4 space-y-3">
            <InfoBox label="Crop" value={field?.crop ?? '-'} />
            <InfoBox label="Survey Status" value={selectedSurvey?.status ?? '-'} />
            <InfoBox label="Samples" value={reportReadings.length} />
            <InfoBox label="Average Health" value={`${Math.round(reportReadings.reduce((sum, item) => sum + item.soilHealth, 0) / Math.max(reportReadings.length, 1))}%`} />
          </div>
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">NPK and Moisture Trends</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportReadings}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="pointIndex" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="nitrogen" stroke="#2E7D32" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="phosphorus" stroke="#66BB6A" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="potassium" stroke="#0F766E" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="moisture" stroke="#2563EB" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ settings, online, pending, refreshPending }: { settings?: Settings; online: boolean; pending: number; refreshPending: () => void }) {
  if (!settings) return null;
  const update = (patch: Partial<Settings>) => db.settings.update('settings', patch);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">Preferences</h2>
        <div className="mt-5 space-y-4">
          <label className="space-y-1">
            <span className="label">Sampling Distance</span>
            <input className="input w-full" type="number" value={settings.samplingDistance} onChange={(event) => update({ samplingDistance: Number(event.target.value) })} />
          </label>
          <label className="space-y-1">
            <span className="label">Units</span>
            <select className="input w-full" value={settings.units} onChange={(event) => update({ units: event.target.value as Settings['units'] })}>
              <option>Metric</option>
              <option>Imperial</option>
            </select>
          </label>
          <Toggle label="Dark Mode" value={settings.darkMode} onChange={(value) => update({ darkMode: value })} />
          <Toggle label="Offline Sync" value={settings.offlineSync} onChange={(value) => update({ offlineSync: value })} />
          <label className="space-y-1">
            <span className="label">Language</span>
            <select className="input w-full" value={settings.language} onChange={(event) => update({ language: event.target.value })}>
              <option>English</option>
              <option>Hindi</option>
              <option>Telugu</option>
              <option>Tamil</option>
            </select>
          </label>
        </div>
      </div>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">Offline Sync</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-300">{pending} records pending. Current status: {online ? 'online' : 'offline'}.</p>
          <button
            className="primary-btn mt-5"
            onClick={async () => {
              await syncNow();
              refreshPending();
            }}
          >
            <Cloud size={18} /> Sync Now
          </button>
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">Local Database</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="secondary-btn" onClick={exportBackup}><Download size={17} /> Backup Local Database</button>
            <label className="secondary-btn cursor-pointer">
              <Upload size={17} /> Restore Backup
              <input hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && restoreBackup(event.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl bg-white/60 p-3 text-left dark:bg-white/10" onClick={() => onChange(!value)}>
      <span className="font-semibold">{label}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${value ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`size-5 rounded-full bg-white transition ${value ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function NotificationRow({ item }: { item: { title: string; message: string } }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/60 p-3 dark:bg-white/10">
      <CheckCircle2 className="shrink-0 text-primary" size={18} />
      <div>
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-300">{item.message}</p>
      </div>
    </div>
  );
}
