"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PERM_ROLE, ROLES, type LiveState, type OperatorUser, type Perm, type Role } from "@/lib/types";
import { MODE_KEY, QUEUEABLE, applyLocal, makePacket, readOutbox, writeOutbox, type Packet } from "@/lib/offline";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Impact = {
  food: number; medicine: number; convoys: string[];
  foodFrom: string | null; foodTo: string | null; medFrom: string | null; medTo: string | null;
  before: Record<string, number | null>; after: Record<string, number | null>;
};

const TOKEN_KEY = "displaceos_tab_token";
const CHANNEL = "displaceos_realtime_sync";
const PING_KEY = "displaceos_sync_ping";
const LIVE_KEY = "displaceos_live";
const tabToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; } };
const setTabToken = (t: string | null) => { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* blocked */ } };

type Ctx = {
  data: LiveState | null;
  role: Role | null;
  user: OperatorUser | null;
  sessionPending: boolean;
  can: (p: Perm) => boolean;
  login: (badgeId: string, passcode?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginOpen: boolean;
  requiredRole: Role | null;
  openLogin: (required?: Role | null) => void;
  closeLogin: () => void;
  deny: (p: Perm) => void;
  selectedCampId: string | null;
  setSelectedCampId: (id: string | null) => void;
  survivorQuery: string;
  setSurvivorQuery: (q: string) => void;
  triageId: string | null;
  setTriageId: (id: string | null) => void;
  paletteOpen: boolean;
  setPaletteOpen: (o: boolean) => void;
  selectedDepot: string | null;
  setSelectedDepot: (n: string | null) => void;
  busy: boolean;
  impact: Impact | null;
  setImpact: (i: Impact | null) => void;
  rebalance: () => Promise<void>;
  flood: () => Promise<void>;
  reset: () => Promise<void>;
  createRequest: (p: { resourceType: string; quantityNeeded: number }) => Promise<boolean>;
  approve: (id: string) => Promise<void>;
  adjustStock: (field: string, delta: number) => Promise<void>;
  setDispatch: (id: string, status: string) => Promise<void>;
  advance: (id: string) => Promise<void>;
  registerSurvivor: (p: Record<string, unknown>) => Promise<boolean>;
  setSurvivorStatus: (id: string, status: string, name: string) => Promise<void>;
  offline: boolean;
  setOffline: (o: boolean) => void;
  outbox: Packet[];
  meshOpen: boolean;
  setMeshOpen: (o: boolean) => void;
  syncing: boolean;
  syncOutbox: () => Promise<void>;
  live: boolean;
  setLive: (l: boolean) => void;
  verify: (campId: string) => Promise<void>;
  reinforce: (kind: string, target: { campId?: string; dispatchId?: string }) => Promise<void>;
  requestFacility: (facility: string, campId?: string) => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

const EMPTY_METRICS = { criticalCamps: 0, pendingSOS: 0, activeConvoys: 0, registeredSurvivors: 0, activeDuplicates: 0, minRunwayHours: 99, needsMedevac: 0, avgConfidence: 100, anomalies: 0 };
/** Never let a partial payload crash a render: every collection and the metrics/weights blocks get defaults. */
function norm(s: Partial<LiveState> | null | undefined): LiveState {
  return {
    camps: s?.camps ?? [], requests: s?.requests ?? [], depots: s?.depots ?? [], dispatches: s?.dispatches ?? [],
    survivors: s?.survivors ?? [], events: s?.events ?? [], verifications: s?.verifications ?? [],
    metrics: { ...EMPTY_METRICS, ...(s?.metrics ?? {}) },
    weights: { routeReliability: 1, burnDrift: 1, facilityPenalty: 0.25, history: [], ...(s?.weights ?? {}) },
  };
}

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", "x-displaceos-token": tabToken() } });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error ?? `Request failed (${res.status})`);
  return j;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LiveState | null>(null);
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [sessionPending, setSessionPending] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [requiredRole, setRequiredRole] = useState<Role | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [survivorQuery, setSurvivorQuery] = useState("");
  const [triageId, setTriageId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [offline, setOfflineState] = useState(false);
  const [outbox, setOutbox] = useState<Packet[]>([]);
  const [meshOpen, setMeshOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [live, setLiveState] = useState(true);
  const liveRef = useRef(true);
  const mutating = useRef(0);
  const epoch = useRef(0);
  const chanRef = useRef<BroadcastChannel | null>(null);
  const tabId = useRef("");
  const outboxRef = useRef<Packet[]>([]);
  const offlineRef = useRef(false);
  const userRef = useRef<OperatorUser | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);
  const role = user?.role ?? null;
  const can = useCallback((p: Perm) => (role ? ROLES[role].perms.includes(p) : false), [role]);

  const saveOutbox = useCallback((p: Packet[]) => {
    outboxRef.current = p;
    setOutbox(p);
    writeOutbox(p);
  }, []);

  // Session + persisted mesh state hydrate on mount.
  useEffect(() => {
    tabId.current = Math.random().toString(36).slice(2);
    try {
      const off = localStorage.getItem(MODE_KEY) === "1";
      offlineRef.current = off;
      setOfflineState(off); // eslint-disable-line react-hooks/set-state-in-effect
    } catch { /* storage blocked */ }
    try { const l = localStorage.getItem(LIVE_KEY) !== "0"; liveRef.current = l; setLiveState(l); } catch { /* blocked */ }
    const q = readOutbox();
    outboxRef.current = q;
    setOutbox(q);
    api("/api/auth")
      .then((j) => { setUser(j.user); setTabToken(j.token ?? null); })
      .catch(() => setUser(null))
      .finally(() => setSessionPending(false));
  }, []);

  const refresh = useCallback(async () => {
    // Background polling never overwrites an in-flight mutation or a result that landed while it was fetching.
    if (offlineRef.current || mutating.current > 0) return;
    const ep = epoch.current;
    try {
      const s: LiveState = norm(await api("/api/state"));
      if (mutating.current > 0 || ep !== epoch.current) return;
      const u = userRef.current;
      // Keep queued mesh packets visible on top of fresh server state until they sync.
      setData(u ? outboxRef.current.reduce((acc, pk) => applyLocal(acc, pk, u), s) : s);
    } catch (e) {
      if (e instanceof Error && /Not signed in/.test(e.message)) setUser(null);
    }
  }, []);

  const adopt = useCallback((raw: LiveState) => {
    if (mutating.current > 0) return;
    const st = norm(raw);
    const u = userRef.current;
    setData(u ? outboxRef.current.reduce((acc, pk) => applyLocal(acc, pk, u), st) : st);
  }, []);

  /** Announce a mutation to every other tab (BroadcastChannel first, storage event as fallback). */
  const announce = useCallback(() => {
    try { chanRef.current?.postMessage({ type: "mutated", from: tabId.current }); } catch { /* closed */ }
    try { localStorage.setItem(PING_KEY, `${tabId.current}:${Date.now()}`); } catch { /* blocked */ }
  }, []);

  const badge = user?.badgeId;
  useEffect(() => {
    if (!badge) {
      setData(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    refresh();
    // Live: every 2.5s advance telemetry server-side and adopt fresh state. Otherwise a slow passive poll.
    const t = setInterval(async () => {
      if (offlineRef.current || mutating.current > 0) return;
      if (!liveRef.current) return void refresh();
      try {
        const ep = epoch.current;
        const out = await api("/api/state", { method: "POST", body: JSON.stringify({ action: "TELEMETRY_TICK", payload: {} }) });
        if (ep === epoch.current) adopt(out.state);
      } catch (e) {
        if (e instanceof Error && /Not signed in/.test(e.message)) setUser(null);
      }
    }, 2500);
    const onMsg = (m: MessageEvent) => { if (m.data?.from !== tabId.current) refresh(); };
    const onStorage = (e: StorageEvent) => { if (e.key === PING_KEY && !e.newValue?.startsWith(tabId.current)) refresh(); };
    let ch: BroadcastChannel | null = null;
    try { ch = new BroadcastChannel(CHANNEL); ch.onmessage = onMsg; chanRef.current = ch; } catch { /* unsupported */ }
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
      ch?.close();
      chanRef.current = null;
    };
  }, [badge, refresh, adopt]);

  const setLive = useCallback((l: boolean) => {
    liveRef.current = l;
    setLiveState(l);
    try { localStorage.setItem(LIVE_KEY, l ? "1" : "0"); } catch { /* blocked */ }
    toast(l ? "🟢 Live telemetry stream ON" : "Live telemetry paused", { description: l ? "Real-time sync across tabs" : "Passive polling only" });
  }, []);

  const setOffline = useCallback(
    (o: boolean) => {
      offlineRef.current = o;
      setOfflineState(o);
      try { localStorage.setItem(MODE_KEY, o ? "1" : "0"); } catch { /* storage blocked */ }
      if (o) toast.warning("OFFLINE FIELD MODE · Cloud severed", { description: "Mutations queue as mesh packets in the local outbox" });
      else {
        toast.success("Uplink restored", { description: outboxRef.current.length ? `${outboxRef.current.length} mesh packet(s) waiting to sync` : "Live sync resumed" });
        refresh();
      }
    },
    [refresh],
  );

  const openLogin = useCallback((r: Role | null = null) => { setRequiredRole(r); setLoginOpen(true); }, []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const login = useCallback(async (badgeId: string, passcode?: string) => {
    try {
      const j = await api("/api/auth", { method: "POST", body: JSON.stringify(passcode ? { badgeId, passcode } : { badgeId, instant: true }) });
      setUser(j.user);
      setTabToken(j.token ?? null);
      announce();
      setLoginOpen(false);
      setSelectedCampId(null);
      toast.success(`Authenticated · ${j.user.badgeId}`, { description: ROLES[j.user.role as Role].label });
      return true;
    } catch (e) {
      toast.error("Login failed", { description: e instanceof Error ? e.message : undefined });
      return false;
    }
  }, [announce]);

  const logout = useCallback(async () => {
    await api("/api/auth", { method: "DELETE" }).catch(() => null);
    setTabToken(null);
    setUser(null);
    setData(null);
    toast.success("Signed out");
  }, []);

  const deny = useCallback(
    (p: Perm) => {
      const need = PERM_ROLE[p];
      toast.error(`🔒 Locked · requires ${ROLES[need].short}`, {
        description: role ? `You are signed in as ${ROLES[role].short}` : "Sign in to continue",
        action: { label: `Switch to ${ROLES[need].short}`, onClick: () => openLogin(need) },
      });
    },
    [role, openLogin],
  );

  /** Run an action: queue when offline (field actions), otherwise POST and adopt the fresh server state. */
  const exec = useCallback(
    async (action: string, payload: Record<string, unknown>, fail: string): Promise<{ result: any; queued?: boolean } | null> => {
      if (!user) { openLogin(); return null; }
      if (offlineRef.current) {
        if (!QUEUEABLE.has(action)) {
          toast.error("Cloud uplink required", { description: "This command action cannot run in OFFLINE FIELD MODE" });
          return null;
        }
        const pk = makePacket(action, payload, user);
        saveOutbox([...outboxRef.current, pk]);
        setData((d) => (d ? applyLocal(d, pk, user) : d));
        toast.info("OFFLINE_QUEUED (Mesh Packet Ready)", { description: `${action} · ${pk.bytes} B queued for burst sync` });
        return { result: null, queued: true };
      }
      setBusy(true);
      mutating.current += 1;
      epoch.current += 1;
      try {
        const out = await api("/api/state", { method: "POST", body: JSON.stringify({ action, payload }) });
        setData(norm(out.state));
        announce();
        return { result: out.result };
      } catch (e) {
        toast.error(fail, { description: e instanceof Error ? e.message : undefined });
        return null;
      } finally {
        mutating.current -= 1;
        epoch.current += 1;
        setBusy(false);
      }
    },
    [user, openLogin, saveOutbox, announce],
  );

  const syncOutbox = useCallback(async () => {
    const q = outboxRef.current;
    if (!q.length || syncing) return;
    setSyncing(true);
    mutating.current += 1;
    epoch.current += 1;
    try {
      const out = await api("/api/state", {
        method: "POST",
        body: JSON.stringify({ action: "SYNC_OFFLINE_QUEUE", payload: { actions: q.map((p) => ({ action: p.action, payload: p.payload })) } }),
      });
      setData(norm(out.state));
      announce();
      saveOutbox([]);
      const { applied, failed } = out.result;
      toast.success(`⚡ Burst sync complete · ${applied} applied`, { description: failed ? `${failed} packet(s) rejected (RBAC / stale reference)` : "All mesh packets committed to SQLite" });
    } catch (e) {
      toast.error("Mesh sync failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      mutating.current -= 1;
      epoch.current += 1;
      setSyncing(false);
    }
  }, [saveOutbox, syncing, announce]);

  const value = useMemo<Ctx>(
    () => ({
      data, role, user, sessionPending, can, login, logout, loginOpen, requiredRole, openLogin, closeLogin, deny,
      selectedCampId, setSelectedCampId, survivorQuery, setSurvivorQuery, triageId, setTriageId, paletteOpen, setPaletteOpen,
      selectedDepot, setSelectedDepot, busy, impact, setImpact, offline, setOffline, outbox, meshOpen, setMeshOpen, syncing, syncOutbox, live, setLive,
      verify: async (campId) => {
        if (!can("VERIFY")) return deny("VERIFY");
        const r = await exec("VERIFY_GROUND_TRUTH", { campId }, "Verification failed");
        if (r?.result) toast.success(`🛡️ ${r.result.campName} reconciled`, { description: `Accuracy ${r.result.before.score}% → ${r.result.after.score}% · hash ${r.result.hash.slice(0, 12)}…` });
      },
      reinforce: async (kind, target) => {
        if (!can("REINFORCE")) return deny("REINFORCE");
        const r = await exec("DEPLOY_REINFORCEMENT", { kind, ...target }, "Deployment failed");
        if (r) toast.success("🚁 Reinforcement deployed", { description: kind.replaceAll("_", " ") });
      },
      requestFacility: async (facility, campId) => {
        if (!can("FACILITY")) return deny("FACILITY");
        const r = await exec("UPDATE_FACILITY_STATUS", { facility, campId, mode: "REQUEST_REPAIR" }, "Repair request failed");
        if (r) toast.success("🛠️ Repair requested", { description: `${facility} · urgency ${r.result.urgencyScore}` });
      },
      rebalance: async () => {
        if (!can("REBALANCE")) return deny("REBALANCE");
        const r = await exec("REBALANCE_SURPLUS", {}, "Rebalance failed");
        if (!r) return;
        const i: Impact = r.result;
        if (i.food || i.medicine) {
          setImpact(i);
          toast.success("🧠 Surplus rebalanced", {
            description: `${i.food} food ${i.foodFrom} → ${i.foodTo} · ${i.medicine} kits ${i.medFrom} → ${i.medTo}`,
          });
        } else toast.info("Nothing to rebalance", { description: "No surplus/shortage pair detected" });
      },
      flood: async () => {
        if (!can("SIMULATE")) return deny("SIMULATE");
        const r = await exec("SIMULATE_FLASH_FLOOD_SOS", {}, "Simulation failed");
        if (r?.result?.camp) toast.error("🚨 Flash flood SOS", { description: `${r.result.camp.name}: +120 evacuees, NDRF boat dispatched` });
      },
      reset: async () => {
        const r = await exec("RESET_DEMO", {}, "Reset failed");
        if (r) {
          setSelectedCampId(null); setSelectedDepot(null); setTriageId(null); setImpact(null);
          toast.success("↺ Crisis demo reset", { description: "Initial seed state restored" });
        }
      },
      createRequest: async (p) => {
        if (!can("REQUEST")) return (deny("REQUEST"), false);
        const r = await exec("CREATE_REQUEST", p, "Request failed");
        if (r && !r.queued) toast.success("SOS submitted", { description: `${r.result.duplicateFlag ? "Duplicate flagged · " : ""}Urgency score ${r.result.urgencyScore}` });
        return !!r;
      },
      approve: async (id) => {
        if (!can("APPROVE")) return deny("APPROVE");
        const r = await exec("APPROVE_REQUEST", { id }, "Approve failed");
        if (r) toast.success("Allocation approved", { description: "Convoy dispatched from depot" });
      },
      adjustStock: async (field, delta) => {
        if (!can("STOCK")) return deny("STOCK");
        await exec("UPDATE_CAMP_STOCK", { field, delta }, "Stock update failed");
      },
      setDispatch: async (id, status) => {
        if (!can("DISPATCH")) return deny("DISPATCH");
        const r = await exec("UPDATE_DISPATCH_STATUS", { id, status }, "Dispatch update failed");
        if (r && !r.queued) toast.success(status === "DELIVERED" ? "Delivered · camp inventory updated" : `Route: ${status}`);
      },
      advance: async (id) => {
        if (!can("DISPATCH")) return deny("DISPATCH");
        const r = await exec("UPDATE_DISPATCH_STATUS", { id, status: "PROGRESS_25" }, "Progress update failed");
        if (r && !r.queued) toast.success(`Progress ${r.result.progressPercent}%`);
      },
      registerSurvivor: async (p) => {
        if (!can("REGISTER")) return (deny("REGISTER"), false);
        const r = await exec("REGISTER_SURVIVOR", p, "Registration failed");
        if (r && !r.queued) toast.success("Survivor registered");
        return !!r;
      },
      setSurvivorStatus: async (id, status, name) => {
        if (!can("TRIAGE_STATUS")) return deny("TRIAGE_STATUS");
        const r = await exec("UPDATE_SURVIVOR_STATUS", { id, status }, "Status update failed");
        if (r && !r.queued) toast.success(`${name} → ${status}`);
      },
    }),
    [data, role, user, sessionPending, can, login, logout, loginOpen, requiredRole, openLogin, closeLogin, deny, selectedCampId,
      survivorQuery, triageId, paletteOpen, selectedDepot, busy, impact, offline, setOffline, outbox, meshOpen, syncing, syncOutbox, live, setLive, exec],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
