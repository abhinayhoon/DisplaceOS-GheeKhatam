"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { toast } from "sonner";
import type { LiveState, Perm, Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

type Ctx = {
  data: LiveState | null;
  role: Role;
  setRole: (r: Role) => void;
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
  if (!res.ok) throw new Error(`${action} failed (${res.status})`);
  return res.json();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LiveState | null>(null);
  const [role, setRoleState] = useState<Role>("GOV_AGENCY");
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [survivorQuery, setSurvivorQuery] = useState("");
  const [triageId, setTriageId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* offline: keep last state */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, duration: 1.1 });
    return () => lenis.destroy();
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    toast.message(`Role: ${ROLES[r].short}`, { description: ROLES[r].badge });
  }, []);

  const can = useCallback((p: Perm) => ROLES[role].perms.includes(p), [role]);

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
      data, role, setRole, can, selectedCampId, setSelectedCampId, survivorQuery, setSurvivorQuery,
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
    [data, role, setRole, can, selectedCampId, survivorQuery, triageId, paletteOpen, busy, run],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
