import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PipeCardProps {
  productName: string;
  quantity: number;
  amount: number;
  lastUpdated: string | null;
  onAdd: (qty: number) => void;
  onSubtract: (qty: number) => void;
}

export function PipeCard({ productName, quantity, amount, lastUpdated, onAdd, onSubtract }: PipeCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "sub">("add");
  const [inputVal, setInputVal] = useState("");

  function openDialog(mode: "add" | "sub") {
    setDialogMode(mode);
    setInputVal("");
    setDialogOpen(true);
  }

  function handleConfirm() {
    const val = parseInt(inputVal, 10);
    if (!val || val <= 0) return;
    if (dialogMode === "add") {
      onAdd(val);
    } else {
      if (val > quantity) return;
      onSubtract(val);
    }
    setDialogOpen(false);
  }

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("ro-RO") +
      " " +
      new Date(lastUpdated).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-base font-bold text-foreground">{productName}</h3>

        <div className="space-y-1">
          <p className="text-lg font-bold text-destructive">
            {quantity} {quantity === 1 ? "bucată" : "bucăți"}
          </p>
          <p className="text-lg font-bold text-[hsl(var(--status-paid))]">
            De plată: {amount.toLocaleString("ro-RO")} lei
          </p>
        </div>

        <p className="text-sm font-semibold text-muted-foreground">Ultima actualizare: {formattedDate}</p>

        <div className="flex gap-2 mt-auto">
          <Button
            className="flex-1 h-12 text-base"
            onClick={() => openDialog("add")}
          >
            <Plus className="w-5 h-5 mr-1" /> Adaugă
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={() => openDialog("sub")}
            disabled={quantity === 0}
          >
            <Minus className="w-5 h-5 mr-1" /> Scade
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Câte bucăți adaugi?" : "Câte bucăți scoți?"}
            </DialogTitle>
            <DialogDescription>{productName}</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            min={1}
            max={dialogMode === "sub" ? quantity : undefined}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Număr bucăți"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
          {dialogMode === "sub" && quantity > 0 && (
            <p className="text-xs text-muted-foreground">Maxim: {quantity} bucăți</p>
          )}
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={!inputVal || parseInt(inputVal) <= 0}>
              Confirmă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
