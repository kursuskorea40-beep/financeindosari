'use client';

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardView } from "@/components/views/dashboard-view";
import { MasterDataView } from "@/components/views/master-data-view";
import { PlaceholderView } from "@/components/views/placeholder-view";
import { toast } from "sonner";

type ModuleKey =
  | "dashboard"
  | "laba-rugi"
  | "penjualan"
  | "pembelian"
  | "persediaan"
  | "piutang"
  | "hutang"
  | "neraca"
  | "master-data";

const SIDEBAR_ITEMS: { key: ModuleKey; label: string; desc: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", desc: "Ringkasan KPI", icon: "📊" },
  { key: "laba-rugi", label: "Laba Rugi", desc: "Per bulan (Accurate)", icon: "📈" },
  { key: "penjualan", label: "Penjualan", desc: "Transaksi penjualan", icon: "💵" },
  { key: "pembelian", label: "Pembelian", desc: "Transaksi pembelian", icon: "🛒" },
  { key: "persediaan", label: "Persediaan", desc: "Stok bulanan", icon: "📦" },
  { key: "piutang", label: "Piutang", desc: "Saldo + faktur", icon: "💰" },
  { key: "hutang", label: "Hutang", desc: "Saldo + faktur", icon: "💸" },
  { key: "neraca", label: "Neraca", desc: "Per bulan (Accurate)", icon: "⚖️" },
  { key: "master-data", label: "Master Data", desc: "Barang/supplier/pelanggan", icon: "🗃️" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F1E9]">
        <div className="text-[#6D0F2B] text-sm">Memuat...</div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  const user = session.user as any;
  return (
    <div className="flex min-h-screen bg-[#F6F1E9]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#470A1D] text-[#EAE2DB] flex flex-col h-screen sticky top-0">
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-wide text-white">INDOSARI</h1>
          <p className="text-[10px] uppercase tracking-wider text-white/60">Akuntansi 2026</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key)}
              className={`sidebar-item w-full text-left px-3 py-2.5 rounded-md transition-colors flex items-center gap-3 ${activeModule === item.key ? "active" : ""}`}
            >
              <span className="icon-wrap size-7 shrink-0 rounded bg-[#5A0C24] text-white/80 text-xs font-bold flex items-center justify-center">
                {item.icon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{item.label}</span>
                <span className="text-[10px] text-white/40 truncate">{item.desc}</span>
              </div>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 text-[10px] text-white/40">
          <div className="font-medium text-white/70">{user.name}</div>
          <div>{user.role} · {user.cabangNama}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-2 px-2 py-1 rounded border border-white/20 hover:bg-white/10 text-white/70 text-[10px]"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-[#E7E5E4] px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#470A1D]">
              {SIDEBAR_ITEMS.find(i => i.key === activeModule)?.label}
            </h2>
            <p className="text-xs text-[#78716C]">
              {SIDEBAR_ITEMS.find(i => i.key === activeModule)?.desc}
            </p>
          </div>
          <div className="text-xs text-[#78716C]">
            Login sebagai: <span className="font-medium text-[#6D0F2B]">{user.name}</span>
            {" · "}
            <span className="font-medium">{user.cabangNama}</span>
          </div>
        </header>
        <div className="p-6">
          {activeModule === "dashboard" && <DashboardView />}
          {activeModule === "master-data" && <MasterDataView />}
          {["laba-rugi", "penjualan", "pembelian", "persediaan", "piutang", "hutang", "neraca"].includes(activeModule) && (
            <PlaceholderView moduleKey={activeModule} />
          )}
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Username & password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        toast.error("Login gagal. Periksa username/password.");
        setLoading(false);
      } else {
        // Force a refresh so useSession re-fetches
        window.location.reload();
      }
    } catch (e) {
      toast.error("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#470A1D] via-[#6D0F2B] to-[#8A1A38] p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#6D0F2B] flex items-center justify-center text-white font-bold text-2xl">
            I
          </div>
          <CardTitle className="text-2xl font-bold text-[#470A1D]">INDOSARI</CardTitle>
          <p className="text-xs text-[#78716C]">Akuntansi 2026 — Web App</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-[#57534E]">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin1"
                autoFocus
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-[#57534E]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6D0F2B] hover:bg-[#8A1A38] text-white"
            >
              {loading ? "Memproses..." : "Login"}
            </Button>
          </form>
          <div className="mt-5 p-3 bg-[#FBE9EE] border border-[#F0CDD6] rounded-md text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Akun demo:</p>
            <ul className="space-y-0.5 font-mono">
              <li>admin1 / admin123 (Admin, Jakarta)</li>
              <li>finance1 / finance123 (Finance, Jakarta)</li>
              <li>gudang1 / gudang123 (Gudang, Surabaya)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
