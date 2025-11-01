// client/src/pages/Certificates.tsx
import React from "react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

async function getCerts() {
  const res = await fetch(API_BASE + "/certs", { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadFile(file: File, subdir: string) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(API_BASE + `/upload?subdir=${encodeURIComponent(subdir)}`, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function CertificatesPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [type, setType] = React.useState<"image"|"video">("image");
  const [caption, setCaption] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    getCerts().then(d => setItems(d.certs || [])).catch(e => setErr(String(e)));
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const onAdd = async () => {
    if (!file) return;
    try {
      const { url } = await uploadFile(file, "certs");
      const res = await fetch(API_BASE + "/certs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url, type, caption: caption || undefined })
      });
      if (!res.ok) throw new Error(await res.text());
      setFile(null); setCaption("");
      refresh();
    } catch (e: any) {
      setErr(String(e));
    }
  };

  const onDelete = async (id: string) => {
    await fetch(API_BASE + `/certs/${id}`, { method: "DELETE", credentials: "include" });
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Сертификаты</h1>
        <div className="flex items-center gap-2">
          <select value={type} onChange={(e)=>setType(e.target.value as any)} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
            <option value="image">Изображение</option>
            <option value="video">Видео</option>
          </select>
          <input type="file" accept={type==="image" ? "image/*" : "video/*"} onChange={(e)=>setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <input value={caption} onChange={(e)=>setCaption(e.target.value)} placeholder="Подпись (необязательно)" className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm w-60" />
          <button onClick={onAdd} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60" disabled={!file}>Добавить</button>
      </div>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border border-white/10 bg-[#1c1f26] p-2">
            {it.type === "video" ? (
              <video src={it.url} controls className="w-full h-48 rounded-md" />
            ) : (
              <img src={it.url} alt={it.caption ?? ""} className="w-full h-48 object-cover rounded-md" />
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-white/60 truncate">{it.caption ?? "—"}</div>
              <button onClick={()=>onDelete(it.id)} className="text-xs text-red-400 hover:text-red-300">Удалить</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-white/60">Пока нет медиа. Загрузите изображение или видео.</div>
        )}
      </div>
    </div>
  );
}
