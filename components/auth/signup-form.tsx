"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PasswordField, { fieldClass } from "./password-field";

type CampOpt = { id: string; name: string; district: string };

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campId, setCampId] = useState("");
  const [camps, setCamps] = useState<CampOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/register").then((r) => (r.ok ? r.json() : [])).then(setCamps).catch(() => setCamps([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "RELIEF_CAMP", campId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(j.error ?? "Sign up failed");
      toast.error("Sign up failed", { description: j.error });
      return;
    }
    setLoading(false);
    toast.success("Registration submitted", { description: "An administrator must approve your camp account before you can sign in." });
    router.push("/login?pendingApproval=1");
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs text-slate-400">Full name</label>
          <input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs text-slate-400">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs text-slate-400">Password (min 8 characters)</label>
          <PasswordField id="password" value={password} onChange={setPassword} autoComplete="new-password" />
        </div>
        <div>
          <label htmlFor="camp" className="mb-1 block text-xs text-slate-400">Requested camp assignment</label>
          <select id="camp" required value={campId} onChange={(e) => setCampId(e.target.value)} className={fieldClass}>
            <option value="">Select camp…</option>
            {camps.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.district}</option>)}
          </select>
          <p className="mt-1 text-xs text-slate-500">New accounts require administrator approval.</p>
        </div>
        {error && <p role="alert" className="text-sm text-[#EF4444]">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-bold text-[#1a1100] transition hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] active:scale-[0.98] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">Already registered? <Link href="/login" className="text-[#F59E0B] hover:underline">Sign in</Link></p>
    </>
  );
}
