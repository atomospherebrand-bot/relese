import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type Msg = {
  id: string;
  key: string;
  label: string;
  value: string;
  type: "text" | "textarea";
  imageUrl?: string | null;
};

type MessageDefinition = {
  key: string;
  label: string;
  description?: string;
  withImage?: boolean;
  type?: "text" | "textarea";
  defaultValue?: string;
};

const MESSAGE_DEFINITIONS: MessageDefinition[] = [
  {
    key: "welcome",
    label: "Приветствие",
    withImage: true,
    type: "textarea",
    description: "Видит пользователь после /start. Markdown доступен.",
    defaultValue:
      "👋 Привет! Я бот тату-мастера.\n• Запись в пару кликов\n• Напомню о визите\n• Покажу маршрут до студии\n\nРаботаю 24/7 и экономлю до 8 часов в неделю.",
  },
  {
    key: "route",
    label: "Как добраться",
    withImage: true,
    type: "textarea",
    description: "Ответ на кнопку «Как добраться». Поддерживает {studio}, {address}, {links}.",
    defaultValue:
      "📍 *{studio}*\n{address}\n\n{links}\n\nНапиши, если нужна помощь с маршрутом.",
  },
  {
    key: "about",
    label: "О мастерах",
    withImage: true,
    type: "textarea",
    description: "Сообщение под списком мастеров. Markdown доступен.",
    defaultValue: "Это наши мастера 👆",
  },
  {
    key: "pay",
    label: "Оплата",
    type: "textarea",
    description: "Отправляется при нажатии на кнопку «Оплата». Поддерживает {methods}.",
    defaultValue:
      "💳 *Оплата*\n\n{methods}\n\n_Депозит фиксирует слот и вычитается из стоимости сеанса._",
  },
  {
    key: "certs",
    label: "Сертификаты",
    withImage: true,
    type: "textarea",
    description: "Сообщение рядом с медиа сертификатов. Markdown доступен.",
    defaultValue: "🎁 Наши подарочные сертификаты. Выбирай и дари впечатления.",
  },
  {
    key: "certs_empty",
    label: "Сертификаты — пусто",
    type: "textarea",
    description: "Если сертификаты не загружены.",
    defaultValue: "Сертификаты пока не загружены.",
  },
  {
    key: "booking_start",
    label: "Начало записи",
    type: "textarea",
    description: "Шаг выбора даты. Поддерживает {service}, {duration}, {price}.",
    defaultValue: "Услуга: {service}\nДлительность: {duration} мин\nЦена: {price} ₽\n\nВыберите дату:",
  },
  {
    key: "booking_confirmed",
    label: "Подтверждение записи",
    type: "textarea",
    description: "Сообщение после бронирования. Поддерживает {service}, {date}, {time}, {address}.",
    defaultValue:
      "✅ Запись подтверждена!\n\nУслуга: {service}\nДата и время: {date} • {time}\nАдрес: {address}\n\nЯ пришлю напоминание заранее. До встречи!",
  },
];

const DEFINITION_MAP = new Map(MESSAGE_DEFINITIONS.map((item) => [item.key, item]));

const createClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;

export default function BotMessagesProPage() {
  const { toast } = useToast();
  const generatedIdsRef = React.useRef<Record<string, string>>({});
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["bot-messages"],
    queryFn: () => api.getMessages(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value, imageUrl }: { key: string; value: string; imageUrl?: string | null }) => {
      const current = (messagesQuery.data ?? []) as Msg[];
      const definition = DEFINITION_MAP.get(key);
      const map = new Map(current.map((item) => [item.key, item]));
      const existing = map.get(key);

      const nextEntry: Msg = existing
        ? { ...existing, value, imageUrl: imageUrl ?? null }
        : {
            id: generatedIdsRef.current[key] ?? createClientId(),
            key,
            label: definition?.label ?? key,
            value,
            type: definition?.type ?? "textarea",
            imageUrl: imageUrl ?? null,
          };

      map.set(key, nextEntry);
      return api.saveMessages(Array.from(map.values()));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-messages"] });
      toast({ title: "Сохранено", description: "Сообщение обновлено" });
    },
    onError: (err: Error) => {
      toast({ title: "Не удалось сохранить", description: err.message, variant: "destructive" });
    },
  });

  const messagesByKey = React.useMemo(() => {
    const map: Record<string, Msg> = {};
    const rows = (messagesQuery.data ?? []) as Msg[];
    rows.forEach((msg) => {
      map[msg.key] = msg;
    });

    for (const definition of MESSAGE_DEFINITIONS) {
      if (!map[definition.key]) {
        const id = generatedIdsRef.current[definition.key] ?? createClientId();
        generatedIdsRef.current[definition.key] = id;
        map[definition.key] = {
          id,
          key: definition.key,
          label: definition.label,
          value: definition.defaultValue ?? "",
          type: definition.type ?? "textarea",
          imageUrl: null,
        };
      }
    }

    return map;
  }, [messagesQuery.data]);

  const orderedKeys = React.useMemo(() => {
    const primary = MESSAGE_DEFINITIONS.map((item) => item.key).filter((key) => messagesByKey[key]);
    const additional = Object.keys(messagesByKey)
      .filter((key) => !DEFINITION_MAP.has(key))
      .sort((a, b) => {
        const left = messagesByKey[a]?.label ?? a;
        const right = messagesByKey[b]?.label ?? b;
        return left.localeCompare(right, "ru");
      });
    return [...primary, ...additional];
  }, [messagesByKey]);

  const [selectedKey, setSelectedKey] = React.useState<string>(() => orderedKeys[0] ?? MESSAGE_DEFINITIONS[0]?.key ?? "welcome");

  React.useEffect(() => {
    if (orderedKeys.length === 0) return;
    if (!orderedKeys.includes(selectedKey)) {
      setSelectedKey(orderedKeys[0]);
    }
  }, [orderedKeys, selectedKey]);

  const definition = DEFINITION_MAP.get(selectedKey);
  const current = messagesByKey[selectedKey];

  const [text, setText] = React.useState(current?.value ?? "");
  const [imageUrl, setImageUrl] = React.useState(current?.imageUrl ?? "");

  React.useEffect(() => {
    setText(current?.value ?? "");
    setImageUrl(current?.imageUrl ?? "");
  }, [current?.value, current?.imageUrl, selectedKey]);

  const handleSave = () => {
    if (!selectedKey) return;
    saveMutation.mutate({
      key: selectedKey,
      value: text,
      imageUrl: imageUrl?.trim() ? imageUrl.trim() : undefined,
    });
  };

  const handlePickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(file, { subdir: "messages" });
      setImageUrl(uploaded.url);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      toast({ title: "Не удалось загрузить", description: error, variant: "destructive" });
    }
  };

  const loading = messagesQuery.isLoading;

  return (
    <div className="grid gap-6 p-4 md:grid-cols-[280px_1fr] md:p-6">
      <div className="rounded-xl border border-white/10 bg-[#1c1f26]">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-white/70">Блоки сообщений</div>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <ul className="divide-y divide-white/5">
              {orderedKeys.map((key) => {
                const meta = DEFINITION_MAP.get(key);
                const active = selectedKey === key;
                const label = messagesByKey[key]?.label ?? meta?.label ?? key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={
                        "flex w-full flex-col px-4 py-3 text-left text-sm transition hover:bg-white/5 " +
                        (active ? "bg-white/10 text-white" : "text-white/70")
                      }
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-[11px] text-white/40">{key}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1c1f26] p-5">
        {messagesQuery.isError ? (
          <p className="text-sm text-red-300">{(messagesQuery.error as Error)?.message ?? "Не удалось загрузить сообщения"}</p>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{definition?.label ?? current?.label ?? selectedKey}</div>
                <div className="text-xs text-white/40">{selectedKey}</div>
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 md:mt-0 md:w-auto"
              >
                {saveMutation.isPending ? "Сохраняем…" : "Сохранить"}
              </Button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Текст сообщения</label>
                <Textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-[160px] resize-vertical border-white/10 bg-black/20 text-sm text-white placeholder:text-white/40"
                  placeholder="Введите текст, поддерживается Markdown"
                />
                {definition?.description && (
                  <p className="mt-2 text-xs text-white/40">{definition.description}</p>
                )}
              </div>

              {definition?.withImage && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Картинка</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="/uploads/messages/welcome.jpg"
                      className="flex-1 border-white/10 bg-black/20 text-sm text-white placeholder:text-white/40"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
                      Загрузить
                    </label>
                  </div>
                  {imageUrl ? (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <img
                        src={imageUrl}
                        alt="Превью"
                        className="mx-auto max-h-64 w-auto rounded object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-white/40">Можно вставить URL или загрузить файл с компьютера.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
