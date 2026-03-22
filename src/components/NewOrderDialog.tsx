import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product, ClientPrice } from "@/lib/supabase-helpers";

interface OrderLine {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  clientPrices: ClientPrice[];
  onSave: (items: OrderLine[], notes?: string, createdAt?: string) => void;
}

export function NewOrderDialog({ open, onOpenChange, products, clientPrices, onSave }: NewOrderDialogProps) {
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    if (open) {
      setLines([]);
      setNotes("");
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDateTime(now.toISOString().slice(0, 16));
    }
  }, [open]);

  function getEffectivePrice(productId: string) {
    const cp = clientPrices.find((p) => p.product_id === productId);
    if (cp) return cp.custom_price;
    const product = products.find((p) => p.id === productId);
    return product?.base_price || 0;
  }

  function addLine() {
    if (products.length === 0) return;
    const firstAvailable = products[0];
    setLines([...lines, { product_id: firstAvailable.id, quantity: 1, unit_price: getEffectivePrice(firstAvailable.id) }]);
  }

  function updateLine(index: number, field: keyof OrderLine, value: string | number) {
    const updated = [...lines];
    if (field === "product_id") {
      updated[index].product_id = value as string;
      updated[index].unit_price = getEffectivePrice(value as string);
    } else if (field === "quantity") {
      updated[index].quantity = Math.max(1, Number(value));
    } else if (field === "unit_price") {
      updated[index].unit_price = Number(value);
    }
    setLines(updated);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function resetPrice(index: number) {
    const updated = [...lines];
    updated[index].unit_price = getEffectivePrice(updated[index].product_id);
    setLines(updated);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    const validLines = lines.filter((l) => l.quantity > 0);
    if (validLines.length === 0) return;
    onSave(validLines, notes.trim() || undefined, dateTime ? new Date(dateTime).toISOString() : undefined);
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Înregistrare nouă</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="datetime">Data și ora</Label>
            <Input id="datetime" type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Produse</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Adaugă produs
              </Button>
            </div>

            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Apasă „Adaugă produs" pentru a începe</p>
            )}

            {lines.map((line, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Produs</Label>
                    <Select value={line.product_id} onValueChange={(v) => updateLine(i, "product_id", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-5 shrink-0" onClick={() => removeLine(i)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Bucăți</Label>
                    <Input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Preț bucată</Label>
                    <div className="flex gap-1">
                      <Input type="number" min={0} value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => resetPrice(i)} title="Resetează prețul">
                        <RotateCcw className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Subtotal: <span className="font-semibold text-foreground">{(line.quantity * line.unit_price).toLocaleString("ro-RO")} lei</span>
                </p>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="order-notes">Observații</Label>
            <Textarea id="order-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opțional" rows={2} />
          </div>

          {lines.length > 0 && (
            <div className="text-right text-lg font-bold">
              Total: {total.toLocaleString("ro-RO")} lei
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
            <Button type="submit" disabled={lines.length === 0}>Salvează</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
