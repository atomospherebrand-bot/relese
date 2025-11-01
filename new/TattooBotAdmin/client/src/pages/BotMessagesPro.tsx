// client/src/pages/BotMessagesPro.tsx
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Msg = {
  id: string;
  key: string;
  label: string;
  value: string;
  type: "text" | "textarea";
  imageUrl?: string | null;
};

const ORDER: Array<{key:string; label:string; withImage?: boolean}> = [
  { key: "welcome", label: "Приветствие", withImage: true },
  { key: "about", label: "О студии", withImage: true },
  { key: "pay", label: "Оплата" },
  { key: "addr_text", label: "Адрес" },
  { key: "contacts", label: "Контакты" },
  { key: "portfolio_text", label: "Портфолио" },
  { key: "certs_text", label: "Сертификаты", withImage: true },
];

export default function BotMessagesProPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["bot-messages"],
    queryFn: () => api.getMessages(),
  });

  const mSave = useMutation({
    mutationFn: (payload: { key: string; value: string; imageUrl?: string }) => {
      const current = (data ?? []) as Msg[];
      const next = current.map(m => m.key === payload.key ? { ...m, value: payload.value, imageUrl: payload.imageUrl } : m);
      return api.saveMessages(next);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot-messages"] }),
  });

  const [selectedKey, setSelectedKey] = React.useState<string>("welcome");
  const map: Record<string, Msg> = React.useMemo(() => {
    const d = (data ?? []) as Msg[];
    const out: Record<string, Msg> = {};
    d.forEach((m) => (out[m.key] = m));
    ORDER.forEach(({ key, label }) => {
      if (!out[key]) out[key] = { id: key, key, label, value: "", type: "text", imageUrl: "" };
    });
    return out;
  }, [data]);

  const current = map[selectedKey];
  const [text, setText] = React.useState(current?.value ?? "");
  const [imageUrl, setImageUrl] = React.useState<string>((current?.imageUrl as string) ?? "");

  React.useEffect(() => {
    setText(current?.value ?? "");
    setImageUrl((current?.imageUrl as string) ?? "");
  }, [selectedKey, current?.value, current?.imageUrl]);

  const onSave = () => {
    mSave.mutate({ key: selectedKey, value: text, imageUrl: imageUrl || undefined });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await api.uploadFile(file, "messages");
    setImageUrl(url);
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      <div className="rounded-xl border border-white/10 bg-[#1c1f26]">
        <div className="px-4 py-3 border-b border-white/10 text-sm text-white/70">Сообщения</div>
        <ul className="max-h-[70vh] overflow-auto divide-y divide-white/5">
          {ORDER.map((item) => {
            const active = selectedKey === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => setSelectedKey(item.key)}
                  className={"w-full text-left px-4 py-3 text-sm hover:bg-white/5 " + (active ? "bg-white/10" : "")}
                >
                  {item.label}
                  <div className="text-[11px] text-white/40">{item.key}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1c1f26] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">{ORDER.find(o => o.key===selectedKey)?.label}</div>
            <div className="text-xs text-white/50">{selectedKey}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              disabled={mSave.isPending}
            >
              {mSave.isPending ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Текст</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[140px] w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Введите текст сообщения…"
            />
          </div>

          {ORDER.find(o => o.key === selectedKey)?.withImage && (
            <div>
              <label className="mb-1 block text-sm text-white/70">Картинка</label>
              <div className="flex gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="/uploads/messages/welcome.jpg"
                />
                <label className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/20 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                  Загрузить
                </label>
              </div>
              {imageUrl ? (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2">
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="max-h-60 w-auto object-contain mx-auto rounded"
                  />
                </div>
              ) : (
                <p className="text-xs text-white/40 mt-1">Можно вставить URL или загрузить файл с компьютера.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
