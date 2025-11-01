import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageIcon, Trash2, Video } from "lucide-react";

type Item = {
  id: string;
  url: string;
  title: string;
  mediaType?: "image" | "video";
  masterId?: string | null;
  masterName?: string | null;
  style?: string | null;
  thumbnail?: string | null;
  createdAt?: string | null;
};

type Props = {
  items: Item[];
  onDelete: (id: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function PortfolioGallery({ items, onDelete }: Props) {
  if (!items?.length) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 border-white/10 bg-black/20 py-10 text-center text-white/60">
        <ImageIcon className="h-8 w-8" />
        <p className="max-w-sm text-sm text-white/70">
          Здесь появятся загруженные работы. Добавьте первое изображение или видео, чтобы заполнить портфолио студии.
        </p>
      </Card>
    );
  }

  const handleDelete = (item: Item) => {
    if (confirm(`Удалить работу «${item.title}»?`)) {
      onDelete(item.id);
    }
  };

  return (
    <TooltipProvider>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isVideo = (item.mediaType ?? "image") === "video";
          const cover = isVideo ? item.thumbnail || item.url : item.url;
          return (
            <Card key={item.id} className="overflow-hidden border-white/10 bg-[#161a20] text-white">
              <div className="relative aspect-video overflow-hidden">
                {isVideo ? (
                  <video
                    src={item.url}
                    poster={cover}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                )}

                <div className="absolute right-3 top-3 flex gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1 bg-black/60 text-xs font-medium uppercase text-white">
                    {isVideo ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    {isVideo ? "Видео" : "Фото"}
                  </Badge>
                </div>
              </div>

              <CardContent className="space-y-3 p-4">
                <div>
                  <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    {item.masterName && <Badge variant="outline" className="border-white/20 bg-white/5 text-xs">{item.masterName}</Badge>}
                    {item.style && <Badge className="bg-white/10 text-xs text-white">#{item.style}</Badge>}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-white/5 bg-black/10 px-4 py-3 text-xs text-white/60">
                <span>{formatDate(item.createdAt)}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                      className="text-white/70 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Удалить работу</TooltipContent>
                </Tooltip>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
