"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { LiveState, Perm, Role } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { authClient } from "@/lib/auth-client";

type Ctx = {
  data: LiveState | null;
  role: Role | null;
  user: { id: string; name: string; email: string; role: Role; campId: string | null } | null;
  sessionPending: boolean;
  can: (p: Perm) => boolean;
  selectedCampId: string | null;
  setSelectedCampId: (id: string | null) => void;
  survivorQuery: string;
  setSurvivorQuery: (q: string) => void;
  triageId: string | null;
  setTriageId: (id: string | null) => void;
  paletteOpen: boolean;
  setPaletteOpen: (o: boolean) => void;
  busy: boolean;
  rebalance: () => Promise<void>;
  flood: () => Promise<void>;
  createRequest: (p: { campId: string; resourceType: string; quantityNeeded: number }) => Promise<boolean>;
  setDispatch: (id: string, routeStatus: string) => Promise<void>;
  savePerson: (p: Record<string, unknown>, msg?: string) => Promise<boolean>;
  approve: (id: string) => Promise<void>;
  adjustStock: (campId: string, field: string, delta: number) => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

async function post(action: string, payload?: unknown) {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error ?? `${action} failed (${res.status})`);
  }
  return res.json();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LiveState | null>(null);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const su = session?.user as ({ id: string; name: string; email: string; role?: string | null; campId?: string | null } | undefined);
  const user = useMemo(
    () => (su ? { id: su.id, name: su.name, email: su.email, role: (su.role ?? "RELIEF_CAMP") as Role, campId: su.campId ?? null } : null),
    [su?.id, su?.name, su?.email, su?.role, su?.campId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const role = user?.role ?? null;
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [survivorQuery, setSurvivorQuery] = useState("");
  const [triageId, setTriageId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setData(await res.json());
      else if (res.status === 401) setData(null);
    } catch {
      /* offline: keep last state */
    }
  }, []);

  const uid = user?.id;
  useEffect(() => {
    if (!uid) {
      setData(null);
      return;
    }
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [uid, refresh]);

  const can = useCallback((p: Perm) => (role ? ROLES[role].perms.includes(p) : false), [role]);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, fail: string): Promise<T | null> => {
      setBusy(true);
      try {
        const out = await fn();
        await refresh();
        return out;
      } catch (e) {
        toast.error(fail, { description: e instanceof Error ? e.message : undefined });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const value = useMemo<Ctx>(
    () => ({
      data, role, user, sessionPending, can, selectedCampId, setSelectedCampId, survivorQuery, setSurvivorQuery,
      triageId, setTriageId, paletteOpen, setPaletteOpen, busy,
      rebalance: async () => {
        if (!can("REBALANCE")) return void toast.error("Locked", { description: "Gov Agency role required" });
        const r = await run(() => post("rebalance"), "Rebalance failed");
        if (!r) return;
        if (r.food || r.medicine) {
          toast.success("Surplus rerouted", {
            description: `${r.food} food packets Alpha → Delta · ${r.medicine} medical kits Chamoli Depot → Gamma`,
          });
        } else toast.info("Nothing to rebalance", { description: "No surplus detected" });
      },
      flood: async () => {
        if (!can("SIMULATE")) return void toast.error("Locked", { description: "Gov Agency or Rescue Team role required" });
        const r = await run(() => post("flood"), "Simulation failed");
        if (r?.camp) toast.error("🚨 Flash flood SOS", { description: `${r.camp.name}: +120 evacuees, NDRF boat dispatched` });
      },
      createRequest: async (p) => {
        if (!can("REQUEST")) return (toast.error("Locked", { description: "Relief Camp role required" }), false);
        const r = await run(() => post("createRequest", p), "Request failed");
        if (!r) return false;
        toast.success("SOS submitted", {
          description: r.duplicateFlag ? `Duplicate flagged · urgency ${r.urgencyScore}` : `Urgency score ${r.urgencyScore}`,
        });
        return true;
      },
      setDispatch: async (id, routeStatus) => {
        if (!can("DISPATCH")) return void toast.error("Locked", { description: "Rescue Team role required" });
        const r = await run(() => post("dispatchStatus", { id, routeStatus }), "Dispatch update failed");
        if (r) toast.success(routeStatus === "DELIVERED" ? "Delivered · camp inventory updated" : `Route: ${routeStatus}`);
      },
      savePerson: async (p, msg) => {
        const r = await run(() => post("person", p), "Save failed");
        if (r) toast.success(msg ?? "Survivor registered");
        return !!r;
      },
      approve: async (id) => {
        if (!can("APPROVE")) return void toast.error("Locked", { description: "Gov Agency role required" });
        const r = await run(() => post("approve", { id }), "Approve failed");
        if (r) toast.success("Allocation approved");
      },
      adjustStock: async (campId, field, delta) => {
        if (!can("STOCK")) return void toast.error("Locked", { description: "Relief Camp role required" });
        await run(() => post("stock", { campId, field, delta }), "Stock update failed");
      },
    }),
    [data, role, user, sessionPending, can, selectedCampId, survivorQuery, triageId, paletteOpen, busy, run],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
