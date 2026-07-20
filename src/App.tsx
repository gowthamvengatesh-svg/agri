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
  Cpu,
  Copy,
  Crosshair,
  Download,
  FileBarChart,
  Gamepad2,
  Gauge,
  Home,
  Leaf,
  LogOut,
  Map,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Signal,
  Square,
  Sun,
  Trash2,
  User as UserIcon,
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
import type { AIInput, Field, Role, RoverConfig, RoverStatus, SensorReading, Settings, Survey, User } from './types';
import { computeField, generateAIRecommendation, uid } from './lib/calculations';
import { db } from './lib/db';
import { useClock, useLiveQuery, useOnlineStatus } from './lib/hooks';
import { getLiveReading, getRoverStatus } from './services/rover';
import { pendingSyncCount, syncNow } from './services/sync';
import { exportBackup, restoreBackup } from './services/backup';
import { exportCSV, exportPDF } from './services/export';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './hooks/useAuth';
import * as rover from './services/rover';

type Page = 'dashboard' | 'fields' | 'rover' | 'survey' | 'map' | 'ai' | 'reports' | 'diagnostics' | 'settings';

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'fields', label: 'Fields', icon: Leaf },
  { id: 'rover', label: 'Rover', icon: Radio },
  { id: 'survey', label: 'Survey', icon: Activity },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'ai', label: 'AI Analysis', icon: Bot },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
] as const;

export default function App() {
  const users = useLiveQuery(() => db.users.toArray(), []);
  const fields = useLiveQuery(() => db.fields.orderBy('updatedAt').reverse().toArray(), []);
  const surveys = useLiveQuery(() => db.surveys.orderBy('startedAt').reverse().toArray(), []);
  const readings = useLiveQuery(() => db.readings.orderBy('time').reverse().toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('settings'), undefined as Settings | undefined);
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().limit(3).toArray(), []);
  const roverConfig = useLiveQuery(() => db.roverConfigs.get('primary'), undefined as RoverConfig | undefined);
  const [roverStatus, setRoverStatus] = useState<RoverStatus | undefined>();
  const [page, setPage] = useState<Page>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const online = useOnlineStatus();

  useEffect(() => {
    if (!users.length) return;
    const saved = localStorage.getItem('agrisense-user-id');
    const savedUser = users.find((item) => item.id === saved);
    if (savedUser) {
      if (!currentUser || currentUser.id !== savedUser.id || currentUser.name !== savedUser.name) {
        setCurrentUser(savedUser);
      }
    }
  }, [users, currentUser]);

  useEffect(() => {
    pendingSyncCount().then(setPending);
  }, [fields, surveys, readings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', Boolean(settings?.darkMode));
  }, [settings?.darkMode]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const status = await getRoverStatus(roverConfig?.id || 'primary');
      if (!cancelled) setRoverStatus(status);
    };
    load();
    const interval = window.setInterval(load, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [roverConfig]);

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

  const handleLogout = () => {
    localStorage.removeItem('agrisense-user-id');
    setCurrentUser(undefined);
  };

  if (!users.length) return <LoadingScreen />;
  if (!currentUser) return <LoginScreen users={users} onLogin={(user) => {
    localStorage.setItem('agrisense-user-id', user.id);
    setCurrentUser(user);
  }} settings={settings} />;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5faf5] text-slate-950 transition-colors dark:bg-black dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(102,187,106,.26),transparent_28%),radial-gradient(circle_at_88%_2%,rgba(46,125,50,.20),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(236,249,236,.9))] dark:bg-[radial-gradient(circle_at_15%_10%,rgba(102,187,106,.14),transparent_28%),radial-gradient(circle_at_88%_2%,rgba(46,125,50,.18),transparent_26%),linear-gradient(135deg,#000000,#0a0f0b)]" />
      <Sidebar page={page} setPage={setPage} open={menuOpen} close={() => setMenuOpen(false)} user={currentUser} onLogout={handleLogout} />
      <main className="min-h-screen lg:pl-72">
        <Topbar
          page={page}
          user={currentUser}
          users={users}
          setUser={(user) => {
            localStorage.setItem('agrisense-user-id', user.id);
            setCurrentUser(user);
          }}
          onLogout={handleLogout}
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
                  user={currentUser}
                  onLogout={handleLogout}
                  todaySurveys={todaySurveys}
                  fields={fields}
                  avgHealth={avgHealth}
                  latestSurvey={latestSurvey}
                  latestReadings={latestReadings}
                  pending={pending}
                  online={online}
                  setPage={setPage}
                  notifications={notifications}
                  roverStatus={roverStatus}
                  roverConfig={roverConfig}
                />
              )}
              {page === 'fields' && <Fields fields={fields} />}
              {page === 'rover' && <RoverPage config={roverConfig} status={roverStatus} />}
              {page === 'survey' && <SurveyPage fields={fields} readings={readings} roverConfig={roverConfig} />}
              {page === 'map' && <MapPage fields={fields} readings={readings} activeField={activeField} />}
              {page === 'ai' && <AIPage fields={fields} readings={readings} />}
              {page === 'reports' && <Reports fields={fields} surveys={surveys} readings={readings} />}
              {page === 'diagnostics' && <DiagnosticsPage status={roverStatus} />}
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
    <div className="min-h-screen bg-[#f5faf5] px-4 py-10 text-slate-950 dark:bg-black dark:text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(102,187,106,.28),transparent_28%),linear-gradient(135deg,rgba(255,255,255,.95),rgba(230,247,231,.92))] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(102,187,106,.14),transparent_28%),linear-gradient(135deg,#000000,#0a0f0b)]" />
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
    <div className="grid min-h-screen place-items-center bg-[#f5faf5] dark:bg-black">
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass flex items-center gap-3 rounded-3xl px-6 py-4">
        <Leaf className="text-primary" />
        <span className="font-semibold">Loading AgriSense offline workspace...</span>
      </motion.div>
    </div>
  );
}

function Sidebar({ page, setPage, open, close, user, onLogout }: { page: Page; setPage: (page: Page) => void; open: boolean; close: () => void; user: User; onLogout: () => void }) {
  return (
    <>
      <button aria-label="Close navigation" className={`fixed inset-0 z-30 bg-black/30 lg:hidden ${open ? 'block' : 'hidden'}`} onClick={close} />
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/30 bg-white/70 p-4 shadow-glass backdrop-blur-2xl transition dark:border-white/10 dark:bg-black lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center gap-3 rounded-3xl bg-primary/10 p-3 dark:bg-white/5 dark:border dark:border-white/10">
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
        <div className="absolute bottom-4 left-4 right-4 rounded-3xl bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:bg-white/5 dark:border dark:border-white/10 dark:text-slate-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                <UserIcon size={14} />
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-xs">{user.name}</span>
            </div>
            <button onClick={onLogout} title="Logout" className="text-red-500 hover:text-red-600 font-bold text-xs flex items-center gap-1">
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-300">Role: {user.role} · Offline workspace</p>
        </div>
      </aside>
    </>
  );
}

function Topbar({ page, user, users, setUser, onLogout, online, pending, openMenu, settings }: { page: Page; user: User; users: User[]; setUser: (user: User) => void; onLogout: () => void; online: boolean; pending: number; openMenu: () => void; settings?: Settings }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-[#f5faf5]/75 backdrop-blur-2xl dark:border-white/10 dark:bg-black/80">
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

          {/* User Button */}
          <div className="hidden sm:flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-1.5 shadow-sm dark:bg-white/10 dark:border dark:border-white/10">
            <div className="grid size-8 place-items-center rounded-xl bg-primary/20 text-primary font-bold">
              <UserIcon size={16} />
            </div>
            <div className="text-left text-xs">
              <p className="font-bold leading-tight text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-emerald-400 font-semibold leading-none">{user.role}</p>
            </div>
          </div>

          <select aria-label="Current role" className="input hidden max-w-44 md:block" value={user.id} onChange={(event) => setUser(users.find((item) => item.id === event.target.value) ?? user)}>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.role} - {item.name}
              </option>
            ))}
          </select>

          <ThemeToggle settings={settings} />

          {/* Logout Button */}
          <button 
            title="Logout / Switch Profile"
            className="danger-btn px-3"
            onClick={onLogout}
          >
            <LogOut size={17} />
            <span className="hidden md:inline text-xs">Logout</span>
          </button>
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

function Dashboard({ user, onLogout, todaySurveys, fields, avgHealth, latestSurvey, latestReadings, pending, online, setPage, notifications, roverStatus, roverConfig }: { user: User; onLogout: () => void; todaySurveys: number; fields: Field[]; avgHealth: number; latestSurvey?: Survey; latestReadings: SensorReading[]; pending: number; online: boolean; setPage: (page: Page) => void; notifications: any[]; roverStatus?: RoverStatus; roverConfig?: RoverConfig }) {
  const clock = useClock();
  const [latestReading, setLatestReading] = useState<SensorReading | undefined>();
  const [activeSurvey, setActiveSurvey] = useState<Survey | undefined>();
  
  // Real-time Socket.IO connection
  const { connected: socketConnected } = useSocket({
    autoConnect: true,
    onSensorReading: (reading) => {
      setLatestReading(reading);
    },
    onSurveyStarted: (data) => {
      setActiveSurvey({ id: data.surveyId, fieldId: data.fieldId, status: 'running', startedAt: new Date().toISOString(), sampleCount: 0, batteryStart: 96, connection: 'WiFi', synced: true });
    },
    onSurveyStopped: (data) => {
      setActiveSurvey(prev => prev ? { ...prev, status: 'completed', endedAt: new Date().toISOString() } : undefined);
    }
  });

  // Use real-time reading or latest from database
  const displayReading = latestReading || latestReadings[0];
  const battery = latestReading?.battery || roverStatus?.battery || latestSurvey?.batteryEnd || 0;
  
  // Determine connection status
  const isConnected = socketConnected && roverStatus?.connected;
  const connectionStatus = socketConnected ? (roverStatus?.connected ? 'Connected' : 'Waiting for Rover') : 'Offline';
  const connectionTone = isConnected ? 'green' : socketConnected ? 'amber' : 'neutral';

  return (
    <div className="space-y-6">
      {/* Dashboard User Profile Banner */}
      <section className="glass flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2rem] p-5">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/25">
            <UserIcon size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-extrabold text-primary uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-300">Active local session · Full workspace privileges</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="secondary-btn text-xs" onClick={() => setPage('settings')}>
            <SettingsIcon size={16} /> User Settings
          </button>
          <button className="danger-btn text-xs" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Active Surveys" value={activeSurvey?.status === 'running' ? '1 Running' : todaySurveys} sub={activeSurvey ? 'Survey in progress' : 'Captured today'} />
        <MetricCard icon={Leaf} label="Total Fields" value={fields.length} sub="In your workspace" />
        <MetricCard icon={Gauge} label={displayReading ? 'Soil Health' : 'Average Health'} value={`${displayReading?.soilHealth || avgHealth || 0}%`} sub={displayReading ? 'Live reading' : 'Across samples'} />
        <MetricCard icon={BatteryCharging} label="Battery Status" value={battery ? `${battery}%` : 'Offline'} sub={isConnected ? 'Live from rover' : 'Last known'} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="glass overflow-hidden rounded-[2rem] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-primary">{isConnected ? '🟢 Rover Connected' : '🔴 Offline'}</p>
              <h2 className="mt-1 text-3xl font-bold">{isConnected ? 'Ready for autonomous soil survey' : 'Connection awaiting'}</h2>
              <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
                {isConnected 
                  ? 'WiFi connected. Samples are synced to cloud in real-time.' 
                  : 'Data remains usable without connection. Samples sync when network returns.'}
              </p>
            </div>
            <button className="primary-btn" onClick={() => setPage(isConnected ? 'survey' : 'rover')}>
              <Play size={18} /> {isConnected ? 'Quick Start Survey' : 'Connect Rover'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatusPill label="Rover Status" value={connectionStatus} tone={connectionTone} />
            <StatusPill label="Sync Status" value={pending ? `${pending} pending` : 'Up to date'} tone={pending ? 'amber' : 'green'} />
            <StatusPill label="Local Time" value={clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tone="neutral" />
          </div>

          {/* Live Sensor Grid */}
          {displayReading && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white/65 p-4 dark:bg-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-300">Nitrogen</p>
                <p className="mt-1 text-2xl font-bold">{displayReading.nitrogen}<span className="ml-1 text-sm font-medium text-slate-500">mg/kg</span></p>
              </div>
              <div className="rounded-2xl bg-white/65 p-4 dark:bg-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-300">Phosphorus</p>
                <p className="mt-1 text-2xl font-bold">{displayReading.phosphorus}<span className="ml-1 text-sm font-medium text-slate-500">mg/kg</span></p>
              </div>
              <div className="rounded-2xl bg-white/65 p-4 dark:bg-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-300">Potassium</p>
                <p className="mt-1 text-2xl font-bold">{displayReading.potassium}<span className="ml-1 text-sm font-medium text-slate-500">mg/kg</span></p>
              </div>
              <div className="rounded-2xl bg-white/65 p-4 dark:bg-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-300">Moisture</p>
                <p className="mt-1 text-2xl font-bold">{displayReading.moisture}<span className="ml-1 text-sm font-medium text-slate-500">%</span></p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="mt-7 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latestReadings.slice(-20)}>
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
          {displayReading && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              📍 GPS {displayReading.gps.lat.toFixed(5)}, {displayReading.gps.lng.toFixed(5)} · 🕐 {new Date(displayReading.time).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {/* Network Status */}
          <div className="glass rounded-[2rem] p-6">
            <p className="text-sm font-semibold text-primary">Network & Socket</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{online ? 'Cloud' : 'Offline'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{online ? 'Connected' : 'Protected'}</p>
                </div>
                {online ? <Cloud className="text-primary" size={28} /> : <CloudOff className="text-amber-500" size={28} />}
              </div>
              <div className="border-t border-white/20 pt-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">{socketConnected ? 'WebSocket Connected' : 'Reconnecting...'}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">Real-time updates {socketConnected ? '✓' : '⏳'}</p>
              </div>
            </div>
          </div>

          {/* Alerts & Notifications */}
          <div className="glass rounded-[2rem] p-6">
            <p className="text-sm font-semibold text-primary">Alerts & Notifications</p>
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((item) => <NotificationRow key={item.id} item={item} />)
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-300">✓ No alerts. The rover workspace is calm.</p>
              )}
              {battery < 25 && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  ⚠️ Battery low: {battery}%. Charge rover soon.
                </div>
              )}
              {activeSurvey?.status === 'running' && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  🔄 Survey running: {activeSurvey.fieldId}
                </div>
              )}
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

type RoverFormState = {
  name: string;
  ipAddress: string;
  connectionType: RoverConfig['connectionType'];
  rememberDevice: boolean;
  autoConnect: boolean;
};

function RoverPage({ config, status }: { config?: RoverConfig; status?: RoverStatus }) {
  const [form, setForm] = useState<RoverFormState>({
    name: config?.name ?? 'AgriSense Rover',
    ipAddress: config?.ipAddress ?? '',
    connectionType: config?.connectionType ?? 'WiFi',
    rememberDevice: config?.rememberDevice ?? true,
    autoConnect: config?.autoConnect ?? true
  });

  useEffect(() => {
    setForm({
      name: config?.name ?? 'AgriSense Rover',
      ipAddress: config?.ipAddress ?? '',
      connectionType: config?.connectionType ?? 'WiFi',
      rememberDevice: config?.rememberDevice ?? true,
      autoConnect: config?.autoConnect ?? true
    });
  }, [config?.updatedAt]);

  const saveConnection = async (connected: boolean) => {
    const now = new Date().toISOString();
    await db.roverConfigs.put({
      id: 'primary',
      name: form.name.trim() || 'AgriSense Rover',
      ipAddress: form.ipAddress.trim(),
      connectionType: form.connectionType as RoverConfig['connectionType'],
      rememberDevice: form.rememberDevice,
      autoConnect: form.autoConnect,
      connected,
      lastConnectedAt: connected ? now : config?.lastConnectedAt,
      updatedAt: now
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="glass rounded-[2rem] p-5">
          <div className="flex items-center gap-3">
            <Radio className="text-primary" />
            <h2 className="text-xl font-bold">Rover Connection</h2>
          </div>
          <div className="mt-5 space-y-4">
            <label className="space-y-1">
              <span className="label">Rover Name</span>
              <input className="input w-full" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="label">IP Address</span>
              <input className="input w-full" placeholder="192.168.4.1 or http://192.168.4.1" value={form.ipAddress} onChange={(event) => setForm({ ...form, ipAddress: event.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="label">Connection Type</span>
              <select className="input w-full" value={form.connectionType} onChange={(event) => setForm({ ...form, connectionType: event.target.value as RoverConfig['connectionType'] })}>
                <option value="WiFi">Wi-Fi</option>
                <option value="Bluetooth">Bluetooth (Coming Soon)</option>
                <option value="Offline">Offline Mode</option>
              </select>
            </label>
            <Toggle label="Remember Device" value={form.rememberDevice} onChange={(value) => setForm({ ...form, rememberDevice: value })} />
            <Toggle label="Auto Connect" value={form.autoConnect} onChange={(value) => setForm({ ...form, autoConnect: value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="primary-btn" onClick={() => saveConnection(true)}>
                <Signal size={18} /> Connect
              </button>
              <button className="secondary-btn" onClick={() => saveConnection(false)}>
                <CloudOff size={18} /> Offline Mode
              </button>
            </div>
          </div>
        </div>
        <RoverDashboard config={config} status={status} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <LiveSensorPanel status={status} />
        <ManualControls config={config} />
      </div>
    </div>
  );
}

function DiagnosticsPage({ status }: { status?: RoverStatus }) {
  const diagnostics = Object.entries(status?.diagnostics ?? {});
  return (
    <div className="glass rounded-[2rem] p-5">
      <div className="flex items-center gap-3">
        <Cpu className="text-primary" />
        <h2 className="text-xl font-bold">Rover Diagnostics</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Runtime status and installed-sensor health are surfaced here for the connected rover.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map(([label, value]) => (
          <InfoBox key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function RoverDashboard({ config, status }: { config?: RoverConfig; status?: RoverStatus }) {
  const items = [
    ['Connection Status', status?.connected ? 'Connected' : 'Offline'],
    ['Battery', status?.battery ? `${status.battery}%` : 'Unavailable'],
    ['Firmware Version', status?.firmwareVersion ?? 'Unavailable'],
    ['Current IP', status?.ipAddress ?? config?.ipAddress ?? 'Not configured'],
    ['Wi-Fi Signal', status?.wifiSignal ? `${status.wifiSignal} dBm` : 'Unavailable'],
    ['GPS Status', status?.gpsStatus ?? 'Offline'],
    ['Motor Status', status?.motorStatus ?? 'Offline'],
    ['Current Point', status?.currentSamplingPoint ?? 0]
  ];
  return (
    <div className="glass rounded-[2rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Rover Dashboard</p>
          <h2 className="text-2xl font-bold">{config?.name ?? 'No rover configured'}</h2>
        </div>
        <StatusPill label="Mode" value={config?.connectionType ?? 'Offline'} tone={status?.connected ? 'green' : 'amber'} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([label, value]) => <InfoBox key={label} label={String(label)} value={String(value)} />)}
      </div>
    </div>
  );
}

function LiveSensorPanel({ status }: { status?: RoverStatus }) {
  const [reading, setReading] = useState<SensorReading | undefined>();
  const config = useLiveQuery(() => db.roverConfigs.get('primary'), undefined as RoverConfig | undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const live = await getLiveReading('live', 'live', 1, config);
      if (!cancelled) setReading(live);
    };
    load();
    const interval = window.setInterval(load, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [config]);

  const sensors = status?.sensors ?? { npk: true, moisture: true, gps: true, ph: false, ec: false, temperature: false };
  return (
    <div className="glass rounded-[2rem] p-5">
      <div className="flex items-center gap-3">
        <Gauge className="text-primary" />
        <h2 className="text-xl font-bold">Live Sensor Data</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Installed sensors are detected from ESP32 status. Unavailable sensors are hidden or marked not installed.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sensors.npk && reading && (
          <>
            <InfoBox label="Nitrogen" value={`${reading.nitrogen} mg/kg`} />
            <InfoBox label="Phosphorus" value={`${reading.phosphorus} mg/kg`} />
            <InfoBox label="Potassium" value={`${reading.potassium} mg/kg`} />
          </>
        )}
        {sensors.moisture && reading && <InfoBox label="Moisture" value={`${reading.moisture}%`} />}
        {sensors.gps && reading && <InfoBox label="GPS" value={`${reading.gps.lat.toFixed(5)}, ${reading.gps.lng.toFixed(5)}`} />}
        {!sensors.ph && <InfoBox label="pH" value="Not Installed" />}
        {!sensors.ec && <InfoBox label="EC" value="Not Installed" />}
        {!sensors.temperature && <InfoBox label="Temperature" value="Not Installed" />}
      </div>
    </div>
  );
}

function ManualControls({ config }: { config?: RoverConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roverStatus, setRoverStatus] = useState<RoverStatus | undefined>();
  
  // Subscribe to real-time rover status
  const { connected: socketConnected } = useSocket({
    autoConnect: true,
    onRoverStatus: (status) => {
      setRoverStatus(status);
    }
  });

  const handleCommand = async (command: 'forward' | 'backward' | 'left' | 'right' | 'stop' | 'home', duration: number = 3) => {
    try {
      setLoading(true);
      setError(null);
      
      await rover.moveManual({
        roverId: 'primary',
        command,
        duration
      });
      
      console.log(`✓ ${command} command sent successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to execute ${command}`;
      setError(message);
      console.error(`${command} error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = socketConnected && roverStatus?.connected;

  return (
    <div className="glass rounded-[2rem] p-5">
      <div className="flex items-center gap-3">
        <Gamepad2 className="text-primary" />
        <h2 className="text-xl font-bold">Manual Navigation</h2>
      </div>
      
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className={`size-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium">
          {isConnected ? '🟢 Rover Connected' : socketConnected ? '🟡 Rover Offline' : '🔴 No Connection'}
        </span>
      </div>

      <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
        <span />
        <button 
          className="secondary-btn justify-center" 
          onClick={() => handleCommand('forward', 5)}
          disabled={loading || !isConnected}
        >
          ⬆️ Forward
        </button>
        <span />
        
        <button 
          className="secondary-btn justify-center" 
          onClick={() => handleCommand('left', 3)}
          disabled={loading || !isConnected}
        >
          ⬅️ Left
        </button>
        <button 
          className="danger-btn justify-center" 
          onClick={() => handleCommand('stop', 1)}
          disabled={loading || !isConnected}
        >
          ⏹️ Stop
        </button>
        <button 
          className="secondary-btn justify-center" 
          onClick={() => handleCommand('right', 3)}
          disabled={loading || !isConnected}
        >
          ➡️ Right
        </button>
        
        <button 
          className="secondary-btn justify-center" 
          onClick={() => handleCommand('home', 10)}
          disabled={loading || !isConnected}
        >
          🏠 Home
        </button>
        <button 
          className="secondary-btn justify-center" 
          onClick={() => handleCommand('backward', 5)}
          disabled={loading || !isConnected}
        >
          ⬇️ Back
        </button>
        <span />
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin text-lg">⟳</div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Sending command...</p>
        </div>
      )}

      {roverStatus && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoBox 
            label="Battery" 
            value={roverStatus.battery !== undefined ? `${roverStatus.battery}%` : 'Unknown'} 
          />
          <InfoBox 
            label="Motor Status" 
            value={roverStatus.motorStatus || 'Idle'} 
          />
          <InfoBox 
            label="GPS Status" 
            value={roverStatus.gpsStatus || 'Checking...'} 
          />
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-300">
        💡 Tip: Make sure rover is connected via WiFi before sending commands. Commands will be queued if rover is offline.
      </p>
    </div>
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

function SurveyPage({ fields, readings, roverConfig }: { fields: Field[]; readings: SensorReading[]; roverConfig?: RoverConfig }) {
  const [fieldId, setFieldId] = useState(fields[0]?.id ?? '');
  const [survey, setSurvey] = useState<Survey | undefined>();
  const [connection, setConnection] = useState<RoverConfig['connectionType']>(roverConfig?.connectionType ?? 'Offline');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [latestReading, setLatestReading] = useState<SensorReading | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const field = fields.find((item) => item.id === fieldId) ?? fields[0];
  const surveyReadings = readings.filter((item) => item.surveyId === survey?.id).sort((a, b) => a.pointIndex - b.pointIndex);
  const latest = surveyReadings.at(-1) || latestReading;

  // Listen to real-time socket updates
  const { connected: socketConnected } = useSocket({
    autoConnect: true,
    onSensorReading: (reading) => {
      if (survey && reading.surveyId === survey.id) {
        setLatestReading(reading);
      }
    },
    onSurveyStarted: (data) => {
      if (data.fieldId === fieldId) {
        setSurvey(prev => prev ? { ...prev, status: 'running' } : undefined);
        setRunning(true);
        setElapsed(0);
      }
    },
    onSurveyStopped: (data) => {
      if (data.surveyId === survey?.id) {
        setSurvey(prev => prev ? { ...prev, status: 'completed' } : undefined);
        setRunning(false);
      }
    }
  });

  useEffect(() => {
    if (!fieldId && fields[0]) setFieldId(fields[0].id);
  }, [fields, fieldId]);

  // Timer for elapsed time display
  useEffect(() => {
    if (!running || !survey || !field) return;
    const interval = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, survey, field]);

  const start = async () => {
    if (!field) return;
    try {
      setLoading(true);
      setError(null);
      
      // Call API to start survey
      const result = await rover.startSurvey({
        fieldId: field.id,
        samplingPoints: field.samplingPoints,
        roverId: 'primary'
      });
      
      // Create local survey record
      const created: Survey = {
        id: result.survey.id || uid('survey'),
        fieldId: field.id,
        status: 'running',
        startedAt: new Date().toISOString(),
        sampleCount: 0,
        batteryStart: roverConfig?.connected ? 96 : 100,
        connection,
        synced: true
      };
      
      setSurvey(created);
      setElapsed(0);
      setRunning(true);
      setLatestReading(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start survey';
      setError(message);
      console.error('Start survey error:', err);
    } finally {
      setLoading(false);
    }
  };

  const pause = async () => {
    if (!survey) return;
    try {
      setLoading(true);
      setError(null);
      
      await rover.pauseSurvey({
        surveyId: survey.id,
        roverId: 'primary'
      });
      
      setSurvey(prev => prev ? { ...prev, status: 'paused' } : undefined);
      setRunning(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause survey';
      setError(message);
      console.error('Pause survey error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resume = async () => {
    if (!survey) return;
    try {
      setLoading(true);
      setError(null);
      
      await rover.resumeSurvey({
        surveyId: survey.id,
        roverId: 'primary'
      });
      
      setSurvey(prev => prev ? { ...prev, status: 'running' } : undefined);
      setRunning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume survey';
      setError(message);
      console.error('Resume survey error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    if (!survey) return;
    try {
      setLoading(true);
      setError(null);
      
      await rover.stopSurvey({
        surveyId: survey.id,
        roverId: 'primary'
      });
      
      setSurvey(prev => prev ? { ...prev, status: 'completed', endedAt: new Date().toISOString() } : undefined);
      setRunning(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop survey';
      setError(message);
      console.error('Stop survey error:', err);
    } finally {
      setLoading(false);
    }
  };

  const progress = field ? Math.min(100, Math.round((surveyReadings.length / field.samplingPoints) * 100)) : 0;
  
  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">Survey Workflow</h2>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          <label className="label">Select Field</label>
          <select className="input w-full" value={fieldId} onChange={(event) => setFieldId(event.target.value)} disabled={running}>
            {fields.map((item) => (
              <option key={item.id} value={item.id}>{item.name} · {item.crop}</option>
            ))}
          </select>
          <label className="label">Connection Status</label>
          <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/10">
            <div className="flex items-center gap-2">
              <div className={`size-2.5 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">{socketConnected ? '🟢 Connected' : '🔴 Offline'}</span>
            </div>
          </div>
          <label className="label">Rover Connection</label>
          <div className="grid grid-cols-3 gap-2">
            {(['WiFi', 'Bluetooth', 'Offline'] as const).map((item) => (
              <button key={item} className={`segmented ${connection === item ? 'segmented-active' : ''}`} onClick={() => setConnection(item)} disabled={running}>
                {item}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!survey || survey.status === 'completed' || survey.status === 'stopped' ? (
              <button className="primary-btn col-span-2" onClick={start} disabled={loading || !field || !socketConnected}>
                <Play size={18} /> {loading ? 'Starting...' : 'Start Survey'}
              </button>
            ) : null}
            {survey && running && (
              <button className="secondary-btn" onClick={pause} disabled={loading}>
                <Pause size={17} /> {loading ? 'Pausing...' : 'Pause'}
              </button>
            )}
            {survey && !running && survey.status === 'paused' && (
              <button className="secondary-btn" onClick={resume} disabled={loading}>
                <RotateCw size={17} /> {loading ? 'Resuming...' : 'Resume'}
              </button>
            )}
            {survey && survey.status !== 'completed' && survey.status !== 'stopped' && (
              <button className="danger-btn justify-center" onClick={stop} disabled={loading}>
                <Square size={17} /> {loading ? 'Stopping...' : 'Stop'}
              </button>
            )}
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
          {latest ? <SensorGrid reading={latest} /> : <p className="col-span-full text-slate-500 dark:text-slate-300">Start a survey to stream live sensor values in real-time.</p>}
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
    crop: fields[0]?.crop ?? ''
  });
  const result = useMemo(() => generateAIRecommendation(input), [input]);
  return (
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">AI Soil Analysis</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(['nitrogen', 'phosphorus', 'potassium', 'moisture'] as const).map((key) => (
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
        <ResultCard title="Crop Suitability" value={result.suitability} body="Based on nutrient balance and moisture only." icon={ShieldCheck} />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | undefined>();
      // Note: We don't need to load current user since reports logic works on passed surveys and fields list

  // Find survey matching query
  useEffect(() => {
    const found = surveys.find((survey) => {
      const field = fields.find((f) => f.id === survey.fieldId);
      return field?.name.toLowerCase().includes(query.toLowerCase());
    });
    setSelectedSurvey(found || surveys[0]);
  }, [query, surveys, fields]);

  const field = fields.find((item) => item.id === selectedSurvey?.fieldId);
  const reportReadings = readings.filter((item) => item.surveyId === selectedSurvey?.id).sort((a, b) => a.pointIndex - b.pointIndex);

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { generateCSV, downloadCSV } = await import('./services/history');
      const csv = generateCSV(reportReadings, field, selectedSurvey);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCSV(`agrisense-survey-${field?.name || 'report'}-${timestamp}.csv`, csv);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export CSV';
      setError(message);
      console.error('CSV export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { exportPDF } = await import('./services/export');
      exportPDF(field, selectedSurvey, reportReadings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      setError(message);
      console.error('PDF export error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass flex flex-col gap-3 rounded-[2rem] p-4 sm:flex-row sm:items-center">
        <input className="input flex-1" placeholder="Filter reports by field name" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button 
          className="secondary-btn" 
          onClick={handleExportCSV}
          disabled={loading || !selectedSurvey || reportReadings.length === 0}
        >
          <Download size={17} /> {loading ? 'Exporting...' : 'CSV'}
        </button>
        <button 
          className="primary-btn" 
          onClick={handleExportPDF}
          disabled={loading || !selectedSurvey || reportReadings.length === 0}
        >
          <FileBarChart size={17} /> {loading ? 'Generating...' : 'PDF'}
        </button>
      </div>
      
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">{field?.name ?? 'No report selected'}</h2>
          <div className="mt-4 space-y-3">
            <InfoBox label="Crop" value={field?.crop ?? '-'} />
            <InfoBox label="Survey Status" value={selectedSurvey?.status ?? '-'} />
            <InfoBox label="Samples" value={reportReadings.length} />
            <InfoBox label="Average Health" value={`${reportReadings.length > 0 ? Math.round(reportReadings.reduce((sum, item) => sum + item.soilHealth, 0) / reportReadings.length) : 0}%`} />
            {reportReadings.length > 0 && (
              <>
                <InfoBox label="Avg. Nitrogen" value={`${(reportReadings.reduce((sum, r) => sum + r.nitrogen, 0) / reportReadings.length).toFixed(1)} mg/kg`} />
                <InfoBox label="Avg. Moisture" value={`${(reportReadings.reduce((sum, r) => sum + r.moisture, 0) / reportReadings.length).toFixed(1)}%`} />
              </>
            )}
          </div>
        </div>
        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">NPK and Moisture Trends</h2>
          {reportReadings.length > 0 ? (
            <div className="mt-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportReadings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                  <XAxis dataKey="pointIndex" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="nitrogen" stroke="#2E7D32" strokeWidth={3} dot={false} name="N" />
                  <Line type="monotone" dataKey="phosphorus" stroke="#66BB6A" strokeWidth={3} dot={false} name="P" />
                  <Line type="monotone" dataKey="potassium" stroke="#0F766E" strokeWidth={3} dot={false} name="K" />
                  <Line type="monotone" dataKey="moisture" stroke="#2563EB" strokeWidth={3} dot={false} name="Moisture" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 text-slate-500 dark:text-slate-300">No readings available for this survey</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ settings, online, pending, refreshPending }: { settings?: Settings; online: boolean; pending: number; refreshPending: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, any>>(settings || {});

  // Sync settings when they change
  useEffect(() => {
    setLocalSettings(settings || {});
  }, [settings]);

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      setLoading(true);
      setError(null);

      const { updateUserSettings } = await import('./services/settings');
      await updateUserSettings({ [key]: value });

      // Update local state
      setLocalSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update setting';
      setError(message);
      console.error('Settings update error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="glass rounded-[2rem] p-5">
        <h2 className="text-xl font-bold">Preferences</h2>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        <div className="mt-5 space-y-4">
          <label className="space-y-1">
            <span className="label">Sampling Distance (meters)</span>
            <input 
              className="input w-full" 
              type="number" 
              value={localSettings.samplingDistance || 5}
              onChange={(e) => {
                const value = Number(e.target.value);
                setLocalSettings(prev => ({ ...prev, samplingDistance: value }));
                handleUpdateSetting('samplingDistance', value);
              }}
              disabled={loading}
            />
          </label>
          <label className="space-y-1">
            <span className="label">Units</span>
            <select 
              className="input w-full" 
              value={localSettings.units || 'Metric'}
              onChange={(e) => {
                setLocalSettings(prev => ({ ...prev, units: e.target.value }));
                handleUpdateSetting('units', e.target.value);
              }}
              disabled={loading}
            >
              <option>Metric</option>
              <option>Imperial</option>
            </select>
          </label>
          <Toggle 
            label="Dark Mode" 
            value={localSettings.darkMode || false}
            onChange={(value) => {
              setLocalSettings(prev => ({ ...prev, darkMode: value }));
              handleUpdateSetting('darkMode', value);
            }}
          />
          <Toggle 
            label="Offline Sync" 
            value={localSettings.offlineSync || false}
            onChange={(value) => {
              setLocalSettings(prev => ({ ...prev, offlineSync: value }));
              handleUpdateSetting('offlineSync', value);
            }}
          />
          <label className="space-y-1">
            <span className="label">Language</span>
            <select 
              className="input w-full" 
              value={localSettings.language || 'English'}
              onChange={(e) => {
                setLocalSettings(prev => ({ ...prev, language: e.target.value }));
                handleUpdateSetting('language', e.target.value);
              }}
              disabled={loading}
            >
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
          <h2 className="text-xl font-bold">ESP32 Configuration</h2>
          <div className="mt-5 space-y-4">
            <label className="space-y-1">
              <span className="label">ESP32 IP Address</span>
              <input 
                className="input w-full font-mono text-sm" 
                type="text" 
                placeholder="192.168.1.100"
                value={localSettings.esp32IP || ''}
                onChange={(e) => {
                  setLocalSettings(prev => ({ ...prev, esp32IP: e.target.value }));
                  handleUpdateSetting('esp32IP', e.target.value);
                }}
                disabled={loading}
              />
            </label>
            <label className="space-y-1">
              <span className="label">WiFi Mode</span>
              <select 
                className="input w-full" 
                value={localSettings.wifiMode || 'WiFi'}
                onChange={(e) => {
                  setLocalSettings(prev => ({ ...prev, wifiMode: e.target.value }));
                  handleUpdateSetting('wifiMode', e.target.value);
                }}
                disabled={loading}
              >
                <option>WiFi</option>
                <option>Bluetooth</option>
                <option>LoRa</option>
              </select>
            </label>
            <Toggle 
              label="Auto Connect" 
              value={localSettings.autoConnect || true}
              onChange={(value) => {
                setLocalSettings(prev => ({ ...prev, autoConnect: value }));
                handleUpdateSetting('autoConnect', value);
              }}
            />
          </div>
        </div>

        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">Offline Sync</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-300">{pending} records pending. Current status: {online ? 'online' : 'offline'}.</p>
          <button
            className="primary-btn mt-5"
            onClick={async () => {
              await syncNow();
              refreshPending();
            }}
            disabled={loading}
          >
            <Cloud size={18} /> Sync Now
          </button>
        </div>

        <div className="glass rounded-[2rem] p-5">
          <h2 className="text-xl font-bold">Local Database</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="secondary-btn" onClick={exportBackup}><Download size={17} /> Backup</button>
            <label className="secondary-btn cursor-pointer">
              <Upload size={17} /> Restore
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
