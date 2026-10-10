import { Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trailerSource } from "@/lib/trailer";

export function TrailerLightbox({ title, url }: { title: string; url?: string | null }) {
  const [open, setOpen] = useState(false);
  const source = trailerSource(url);
  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="glass"
          size="icon"
          className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-background/80 text-foreground hover:text-lag-red"
          aria-label={`Watch ${title} trailer`}
          title={`Watch ${title} trailer`}
        >
          <Play className="fill-current" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-4xl gap-0 overflow-hidden rounded-lg border-border bg-background p-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="truncate py-4 pr-12 pl-4 font-display text-base tracking-normal">
          {title} — Trailer
        </DialogTitle>
        {open && (
          <div className="aspect-video w-full bg-surface-2">
            {source.kind === "video" ? (
              <video src={source.url} controls autoPlay playsInline preload="none" className="h-full w-full" />
            ) : (
              <iframe
                src={source.url}
                title={`${title} trailer`}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full border-0"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}