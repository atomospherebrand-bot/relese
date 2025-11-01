import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Settings } from "@shared/schema";

export function SettingsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Settings | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: ({ settings: saved, botRestarted, botAction, botRestartMessage }) => {
      let description: string | undefined;
      let variant: "default" | "destructive" = "default";

      const actionLabels: Record<"start" | "restart" | "stop", string> = {
        start: "Бот запущен с новым токеном",
        restart: "Бот перезапущен с обновлённым токеном",
        stop: "Бот остановлен. Укажите новый токен, чтобы запустить его вновь",
      };

      if (botAction !== "none") {
        if (botRestarted) {
          description = actionLabels[botAction];
          if (botRestartMessage) {
            description += `. ${botRestartMessage}`;
          }
        } else {
          description =
            botRestartMessage ||
            (botAction === "stop"
              ? "Скрипт остановки бота не выполнен. Проверьте настройку BOT_STOP_SCRIPT."
              : "Скрипт перезапуска бота не выполнен. Проверьте настройку BOT_RESTART_SCRIPT.");
          variant = "destructive";
        }
      } else if (botRestartMessage) {
        description = botRestartMessage;
      }

      toast({ title: "Настройки сохранены", description, variant });
      setSettings(saved);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Не удалось сохранить", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!settings) return;
    saveMutation.mutate(settings);
  };

  if (settingsQuery.isLoading || !settings) {
    return <p>Загрузка настроек…</p>;
  }

  if (settingsQuery.isError) {
    return <p className="text-destructive">Не удалось загрузить настройки</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Настройки</h2>
        <Button onClick={handleSave} data-testid="button-save-settings" disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Сохранить
        </Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Telegram Bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <Input
                id="bot-token"
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={settings.botToken}
                onChange={(e) => setSettings({ ...settings, botToken: e.target.value })}
                data-testid="input-bot-token"
              />
              <p className="text-xs text-muted-foreground">
                Получите токен у @BotFather в Telegram
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Информация о студии</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studio-name">Название студии</Label>
              <Input
                id="studio-name"
                value={settings.studioName}
                onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                data-testid="input-studio-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yandex-map-url">Ссылка на Яндекс.Карты</Label>
              <Input
                id="yandex-map-url"
                placeholder="https://yandex.ru/maps/..."
                value={settings.yandexMapUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, yandexMapUrl: e.target.value })}
                data-testid="input-yandex-map-url"
              />
              <p className="text-xs text-muted-foreground">
                Откройте Яндекс.Карты, найдите локацию и скопируйте ссылку
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Широта</Label>
                <Input
                  id="latitude"
                  placeholder="55.755800"
                  value={settings.latitude ?? ""}
                  onChange={(e) => setSettings({ ...settings, latitude: e.target.value })}
                  data-testid="input-latitude"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Долгота</Label>
                <Input
                  id="longitude"
                  placeholder="37.617700"
                  value={settings.longitude ?? ""}
                  onChange={(e) => setSettings({ ...settings, longitude: e.target.value })}
                  data-testid="input-longitude"
                />
              </div>
            </div>

            {settings.latitude && settings.longitude && (
              <div className="space-y-2">
                <Label>Превью карты</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={`https://static-maps.yandex.ru/1.x/?ll=${settings.longitude},${settings.latitude}&size=600,300&z=16&l=map&pt=${settings.longitude},${settings.latitude},pm2rdm`}
                    alt="Map preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(settings.yandexMapUrl, '_blank');
                    }}
                    data-testid="button-open-yandex"
                  >
                    Открыть в Яндекс.Картах
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(`https://maps.google.com/?q=${settings.latitude},${settings.longitude}`, '_blank');
                    }}
                    data-testid="button-open-google"
                  >
                    Открыть в Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const tgUrl = `tg://resolve?domain=ya_maps&start=maps_${settings.latitude}_${settings.longitude}`;
                      window.location.href = tgUrl;
                    }}
                    data-testid="button-open-telegram"
                  >
                    Открыть в Telegram
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="working-hours">Режим работы</Label>
              <Input
                id="working-hours"
                value={settings.workingHours ?? ""}
                onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
                data-testid="input-working-hours"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Способы оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="payment-methods">Принимаемые способы оплаты</Label>
              <Textarea
                id="payment-methods"
                rows={4}
                value={settings.paymentMethods}
                onChange={(e) => setSettings({ ...settings, paymentMethods: e.target.value })}
                data-testid="textarea-payment-methods"
              />
              <p className="text-xs text-muted-foreground">
                Укажите все способы оплаты, которые принимаете
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
