import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import BooksAdmin from "./BooksAdmin";
import Dashboard from "./Dashboard";
import OrdersAdmin from "./OrdersAdmin";
import CustomersAdmin from "./CustomersAdmin";
import { Button, Card, Input, Label } from "./ui";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "books", label: "Books" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Customers" },
] as const;
type Tab = (typeof tabs)[number]["id"];

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 font-sans text-slate-900">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <Shell>
      <div className="grid min-h-screen place-items-center p-6">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 font-serif text-3xl text-[#123f48]">Admin</h1>
          <p className="mb-6 text-sm text-slate-500">Sign in to manage the store.</p>
          <form className="grid gap-4" onSubmit={submit}>
            <Label text="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </Label>
            <Label text="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return setIsAdmin(null);
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  if (!supabase) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl p-10">
          <h1 className="mb-3 text-2xl font-semibold">Admin panel not configured</h1>
          <p className="text-slate-600">
            Create <code>frontend/.env</code> with <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>), then restart the dev server.
          </p>
        </div>
      </Shell>
    );
  }

  if (loading) return <Shell>{null}</Shell>;
  if (!session) return <Login />;
  if (isAdmin === null) return <Shell>{null}</Shell>;

  if (!isAdmin) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl p-10">
          <h1 className="mb-3 text-2xl font-semibold">No admin access</h1>
          <p className="mb-6 text-slate-600">
            {session.user.email} is signed in but is not an admin. Add this user to the{" "}
            <code>admins</code> table (see backend/README.md).
          </p>
          <Button variant="ghost" onClick={() => supabase!.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <span className="font-serif text-xl text-[#123f48]">Store Admin</span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? "bg-[#123f48] text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <a href="/" target="_blank" rel="noreferrer" className="hover:text-slate-900">
              View site ↗
            </a>
            <span className="hidden sm:inline">{session.user.email}</span>
            <Button variant="ghost" onClick={() => supabase!.auth.signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
        {tab === "books" && <BooksAdmin />}
        {tab === "orders" && <OrdersAdmin />}
        {tab === "customers" && <CustomersAdmin />}
      </main>
    </Shell>
  );
}
