// client/src/pages/Clients.tsx
import React from "react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
async function request(path: string, init?: RequestInit) {
  const res = await fetch(API_BASE + path, { headers: { "Content-Type": "application/json" }, credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function download(path: string, filename: string) {
  const res = await fetch(API_BASE + path, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

type Client = {
  id: string;
  telegramId?: string | number;
  username?: string | null;
  fullName?: string | null;
  phone?: string | null;
  consentMarketing?: boolean;
  tags?: string[];
  createdAt?: string;
  lastVisitAt?: string | null;
  bookingsCount?: number;
};

export default function ClientsPage() {
  const [list, setList] = React.useState<Client[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    request("/clients").then((d) => setList(d.clients || [])).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Клиенты</h1>
        <div className="flex gap-2">
          <button onClick={()=>download("/clients/export?fmt=xlsx", "clients.xlsx")} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Экспорт в Excel</button>
          <button onClick={()=>download("/clients/export?fmt=csv", "clients.csv")} className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Экспорт CSV</button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1c1f26] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-2 text-left">Имя</th>
              <th className="px-4 py-2 text-left">Телеграм</th>
              <th className="px-4 py-2 text-left">Телефон</th>
              <th className="px-4 py-2 text-left">Теги</th>
              <th className="px-4 py-2 text-left">Создан</th>
              <th className="px-4 py-2 text-left">Визит</th>
              <th className="px-4 py-2 text-left">Записей</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {err ? (
              <tr><td className="px-4 py-3 text-red-400" colSpan={7}>{err}</td></tr>
            ) : !list ? (
              <tr><td className="px-4 py-3" colSpan={7}>Загрузка…</td></tr>
            ) : list.length === 0 ? (
              <tr><td className="px-4 py-3" colSpan={7}>Пока пусто</td></tr>
            ) : list.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">{c.fullName ?? "—"}</td>
                <td className="px-4 py-3">{c.username ? "@" + c.username : String(c.telegramId ?? "—")}</td>
                <td className="px-4 py-3">{c.phone ?? "—"}</td>
                <td className="px-4 py-3">{(c.tags ?? []).join(", ")}</td>
                <td className="px-4 py-3">{c.createdAt?.slice(0,10) ?? "—"}</td>
                <td className="px-4 py-3">{c.lastVisitAt?.slice(0,10) ?? "—"}</td>
                <td className="px-4 py-3">{c.bookingsCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
