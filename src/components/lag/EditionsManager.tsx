import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/lag/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Game, GameEdition } from "@/lib/lag";
import { gameEditionsQuery } from "@/lib/queries";

type Draft = {
  name: string;
  note: string;
  price_30: string;
  price_60: string;
  price_permanent: string;
  old_price: string;
};

const EMPTY: Draft = {
  name: "",
  note: "",
  price_30: "",
  price_60: "",
  price_permanent: "",
  old_price: "",
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** Admin editor for a game's editions (Standard, Deluxe, Ultimate…) and their prices. */
export function EditionsManager({
  game,
  open,
  onOpenChange,
}: {
  game: Game | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: editions = [], isLoading } = useQuery(
    gameEditionsQuery(open ? (game?.id ?? undefined) : undefined, { admin: true }),
  );
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["game_editions"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!game) throw new Error("No game selected.");
      if (!draft.name.trim()) throw new Error("Edition name is required.");
      const { error } = await supabase.from("game_editions").insert({
        game_id: game.id,
        name: draft.name.trim(),
        note: draft.note.trim() || null,
        price_30: num(draft.price_30),
        price_60: num(draft.price_60),
        price_permanent: num(draft.price_permanent),
        old_price: num(draft.old_price),
        display_order: editions.length,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDraft(EMPTY);
      toast.success("Edition added.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function patch(edition: GameEdition, values: Partial<GameEdition>) {
    const { error } = await supabase.from("game_editions").update(values).eq("id", edition.id);
    if (error) toast.error(error.message);
    else void invalidate();
  }

  async function remove(edition: GameEdition) {
    const { error } = await supabase.from("game_editions").delete().eq("id", edition.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Edition removed.");
      void invalidate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editions — {game?.title ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading editions…</p>
          ) : editions.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No editions yet"
              body="Add editions like Standard, Deluxe or Ultimate with their own prices."
            />
          ) : (
            <div className="grid gap-3">
              {editions.map((e) => (
                <div key={e.id} className="glass grid gap-3 rounded-2xl p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`e-name-${e.id}`}>Edition name</Label>
                      <Input
                        id={`e-name-${e.id}`}
                        defaultValue={e.name}
                        onBlur={(ev) =>
                          ev.target.value.trim() && ev.target.value !== e.name
                            ? void patch(e, { name: ev.target.value.trim() })
                            : undefined
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`e-note-${e.id}`}>Note (optional)</Label>
                      <Input
                        id={`e-note-${e.id}`}
                        defaultValue={e.note ?? ""}
                        onBlur={(ev) => void patch(e, { note: ev.target.value.trim() || null })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["price_30", "Price 30d"],
                        ["price_60", "Price 60d"],
                        ["price_permanent", "Permanent"],
                        ["old_price", "Old price"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field} className="space-y-1.5">
                        <Label htmlFor={`e-${field}-${e.id}`}>{label}</Label>
                        <Input
                          id={`e-${field}-${e.id}`}
                          type="number"
                          defaultValue={e[field]?.toString() ?? ""}
                          onBlur={(ev) => void patch(e, { [field]: num(ev.target.value) })}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <Switch
                        checked={e.visible}
                        onCheckedChange={(v) => void patch(e, { visible: v })}
                      />
                      Visible on site
                    </label>
                    <div className="space-y-1.5">
                      <Label htmlFor={`e-order-${e.id}`} className="text-xs">
                        Order
                      </Label>
                      <Input
                        id={`e-order-${e.id}`}
                        type="number"
                        className="h-9 w-20"
                        defaultValue={e.display_order}
                        onBlur={(ev) => void patch(e, { display_order: Number(ev.target.value) || 0 })}
                      />
                    </div>
                    <Button
                      variant="glass"
                      size="sm"
                      className="ml-auto"
                      onClick={() => void remove(e)}
                      aria-label={`Remove ${e.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-lag-red" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 rounded-2xl bg-surface-2 p-3">
            <p className="text-sm font-semibold">Add a new edition</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-e-name">Edition name</Label>
                <Input
                  id="new-e-name"
                  placeholder="Deluxe Edition"
                  value={draft.name}
                  onChange={(ev) => setDraft((d) => ({ ...d, name: ev.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-e-note">Note (optional)</Label>
                <Input
                  id="new-e-note"
                  placeholder="Includes season pass"
                  value={draft.note}
                  onChange={(ev) => setDraft((d) => ({ ...d, note: ev.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {(
                [
                  ["price_30", "Price 30d"],
                  ["price_60", "Price 60d"],
                  ["price_permanent", "Permanent"],
                  ["old_price", "Old price"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={`new-e-${field}`}>{label}</Label>
                  <Input
                    id={`new-e-${field}`}
                    type="number"
                    value={draft[field]}
                    onChange={(ev) => setDraft((d) => ({ ...d, [field]: ev.target.value }))}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="hero"
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="justify-self-start"
            >
              <Plus className="h-4 w-4" /> {add.isPending ? "Adding…" : "Add Edition"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="glass" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
