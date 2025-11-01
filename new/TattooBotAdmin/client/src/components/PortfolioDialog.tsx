import React from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Loader2, Upload, Video } from "lucide-react";

const MEDIA_OPTIONS: { value: "image" | "video"; label: string; icon: React.ReactNode }[] = [
  { value: "image", label: "Фото", icon: <ImageIcon className="h-4 w-4" /> },
  { value: "video", label: "Видео", icon: <Video className="h-4 w-4" /> },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type FiltersData = Awaited<ReturnType<typeof api.getPortfolioFilters>>;

function useFilePreview(file: File | null) {
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return preview;
}

export default function PortfolioDialog({ open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const { data } = useQuery<{ masters: FiltersData["masters"]; styles: FiltersData["styles"] }>({
    queryKey: ["portfolio", "filters"],
    queryFn: () => api.getPortfolioFilters(),
  });

  const masters = data?.masters ?? [];
  const styleSuggestions = data?.styles ?? [];

  const [title, setTitle] = React.useState("");
  const [style, setStyle] = React.useState("");
  const [masterId, setMasterId] = React.useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = React.useState<"image" | "video">("image");
  const [file, setFile] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState("");
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const preview = useFilePreview(file);
  const thumbnailPreview = useFilePreview(thumbnailFile);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setStyle("");
      setMasterId(undefined);
      setMediaType("image");
      setFile(null);
      setUrl("");
      setThumbnailFile(null);
      setThumbnailUrl("");
      setIsSaving(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (mediaType === "image") {
      setThumbnailFile(null);
      setThumbnailUrl("");
    }
  }, [mediaType]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      setMediaType("image");
    }
  };

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setThumbnailFile(selected);
  };

  const sanitize = (value: string) => value.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const finalTitle = sanitize(title) || "Работа";
    let finalUrl = sanitize(url);
    let finalThumbnail = sanitize(thumbnailUrl) || undefined;
    let finalMediaType: "image" | "video" = mediaType;

    if (!finalUrl && !file) {
      toast({
        title: "Нет файла",
        description: "Загрузите медиафайл или укажите ссылку",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (file) {
        const uploadResult = await api.uploadFile(file, {
          thumbnail: mediaType === "video" ? thumbnailFile ?? null : null,
        });
        finalUrl = uploadResult.url;
        finalMediaType = uploadResult.mediaType;
        if (uploadResult.thumbnail) {
          finalThumbnail = uploadResult.thumbnail;
        }
      }

      if (!finalUrl) {
        throw new Error("Не удалось получить URL медиа");
      }

      await api.addPortfolioItem({
        url: finalUrl,
        title: finalTitle,
        masterId,
        style: sanitize(style) || undefined,
        mediaType: finalMediaType,
        thumbnail: finalMediaType === "video" ? finalThumbnail : undefined,
      });

      toast({ title: "Готово", description: "Работа добавлена в портфолио" });
      onSaved();
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось сохранить работу",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="sm:max-w-xl border-white/10 bg-[#12151d] text-white">
        <DialogHeader className="space-y-1">
          <DialogTitle>Добавить работу</DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Загружайте изображения или видео, указывайте мастера и стиль — бот и сайт подхватят изменения автоматически.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например, Дракон на руке"
                className="border-white/10 bg-black/20 placeholder:text-white/40"
              />
            </div>

            <div className="space-y-2">
              <Label>Медиа</Label>
              <Select value={mediaType} onValueChange={(value) => setMediaType(value as "image" | "video")}>
                <SelectTrigger className="border-white/10 bg-black/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1f27] text-white">
                  {MEDIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="flex items-center gap-2">
                      <div className="mr-2 inline-flex items-center justify-center rounded-full bg-white/10 p-1">
                        {option.icon}
                      </div>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === Select мастер === */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Мастер</Label>
              <Select
                value={masterId ?? "none"}
                onValueChange={(val) => setMasterId(val === "none" ? undefined : val)}
              >
                <SelectTrigger className="border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Без привязки" />
                </SelectTrigger>
                <SelectContent className="bg-[#1b1f27] text-white">
                  <SelectItem value="none">Без привязки</SelectItem>
                  {masters.map((master) => (
                    <SelectItem key={master.id} value={master.id}>
                      {master.nickname || master.name}
                      {!master.isActive ? " • скрыт" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Стиль / тег</Label>
            <Input
              list="portfolio-dialog-style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="реализм, графика"
              className="border-white/10 bg-black/20 placeholder:text-white/40"
            />
            <datalist id="portfolio-dialog-style">
              {styleSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="space-y-3">
            <Label>Файл или ссылка</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 text-sm text-white/60 hover:border-white/40">
                <Upload className="mb-2 h-5 w-5" />
                {file ? "Файл выбран" : "Выберите файл"}
                <Input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                {file && (
                  <Badge variant="secondary" className="mt-2 max-w-[90%] truncate bg-white/10 text-xs text-white">
                    {file.name}
                  </Badge>
                )}
              </label>

              <div className="space-y-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http:// или /uploads/..."
                  className="border-white/10 bg-black/20 placeholder:text-white/40"
                />
                <p className="text-xs text-white/40">
                  Если укажете ссылку, файл загружать не нужно. При загрузке файл сохранится в /uploads автоматически.
                </p>
              </div>
            </div>

            {preview && (
              <div className="overflow-hidden rounded-xl border border-white/10">
                {mediaType === "video" ? (
                  <video src={preview} controls className="aspect-video w-full object-cover" />
                ) : (
                  <img src={preview} alt="Превью" className="aspect-video w-full object-cover" />
                )}
              </div>
            )}
          </div>

          {mediaType === "video" && (
            <div className="space-y-3">
              <Label>Обложка (для превью видео)</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 text-sm text-white/60 hover:border-white/40">
                  <Upload className="mb-2 h-5 w-5" />
                  {thumbnailFile ? "Файл выбран" : "Загрузить превью"}
                  <Input type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
                  {thumbnailFile && (
                    <Badge variant="secondary" className="mt-2 max-w-[90%] truncate bg-white/10 text-xs text-white">
                      {thumbnailFile.name}
                    </Badge>
                  )}
                </label>

                <div className="space-y-2">
                  <Input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="http:// или /uploads/..."
                    className="border-white/10 bg-black/20 placeholder:text-white/40"
                  />
                  <p className="text-xs text-white/40">Можно указать ссылку на готовый кадр</p>
                </div>
              </div>

              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="Превью постера" className="h-32 w-full rounded-xl object-cover" />
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSaving} className="inline-flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Сохранить работу
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

