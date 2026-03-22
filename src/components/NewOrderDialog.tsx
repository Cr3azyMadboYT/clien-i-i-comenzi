import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, RotateCcw, Check } from "lucide-react";
import type { Product, ClientPrice } from "@/lib/supabase-helpers";

interface OrderLine {
  product_id: string;
  quantity: number;
  unit_price: number;
  price_input: string; // string state for editing
}

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  clientPrices: ClientPrice[];
  onSave: (items: { product_id: string; quantity: number; unit_price: number }[], notes?: string, createdAt?: string) => void;
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

  function toggleProduct(product: Product) {
    const existing = lines.find((l) => l.product_id === product.id);
    if (existing) {
      // Deselect
      setLines(lines.filter((l) => l.product_id !== product.id));
    } else {
      const price = getEffectivePrice(product.id);
      setLines([...lines, { product_id: product.id, quantity: 1, unit_price: price, price_input: String(price) }]);
    }
  }

  function updateQuantity(productId: string, delta: number) {
    setLines(lines.map((l) => {
      if (l.product_id !== productId) return l;
      const newQty = Math.max(1, l.quantity + delta);
      return { ...l, quantity: newQty };
    }));
  }

  function updatePriceInput(productId: string, value: string) {
    setLines(lines.map((l) => l.product_id === productId ? { ...l, price_input: value } : l));
  }

  function commitPrice(productId: string) {
    setLines(lines.map((l) => {
      if (l.product_id !== productId) return l;
      const parsed = parseFloat(l.price_input);
      if (isNaN(parsed) || parsed <= 0) {
        // Revert to effective price
        const effective = getEffectivePrice(productId);
        return { ...l, unit_price: effective, price_input: String(effective) };
      }
      return { ...l, unit_price: parsed, price_input: String(parsed) };
    }));
  }

  function resetPrice(productId: string) {
    const effective = getEffectivePrice(productId);
    setLines(lines.map((l) => l.product_id === productId ? { ...l, unit_price: effective, price_input: String(effective) } : l));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validLines = lines.filter((l) => l.quantity > 0 && l.unit_price > 0);
    if (validLines.length === 0) return;
    onSave(
      validLines.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_price })),
      notes.trim() || undefined,
      dateTime ? new Date(dateTime).toISOString() : undefined
    );
  }

  const selectedLines = lines.filter((l) => l.quantity > 0);
  const total = selectedLines.reduce((s, l) => s + l.quantity * l.unit_price, 0);

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

          {/* Product grid - all products visible */}
          <div>
            <Label className="mb-2 block">Selectează produse</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products.map((product) => {
                const isSelected = lines.some((l) => l.product_id === product.id);
                const effectivePrice = getEffectivePrice(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all active:scale-[0.97] ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <p className="text-sm font-semibold leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{effectivePrice.toLocaleString("ro-RO")} lei</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected product details */}
          {selectedLines.length > 0 && (
            <div className="space-y-3">
              <Label>Detalii produse selectate</Label>
              {selectedLines.map((line) => {
                const product = products.find((p) => p.id === line.product_id);
                if (!product) return null;
                return (
                  <div key={line.product_id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold">{product.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Bucăți</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateQuantity(line.product_id, -1)} disabled={line.quantity <= 1}>
                            <Minus className="w-3.5 h-3.5" />
                          </Button>
                          <span className="text-sm font-semibold w-10 text-center">{line.quantity}</span>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => updateQuantity(line.product_id, 1)}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Preț bucată</Label>
                        <div className="flex gap-1 mt-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-8"
                            value={line.price_input}
                            onChange={(e) => updatePriceInput(line.product_id, e.target.value)}
                            onBlur={() => commitPrice(line.product_id)}
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => resetPrice(line.product_id)} title="Resetează prețul">
                            <RotateCcw className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      Subtotal: <span className="font-semibold text-foreground">{(line.quantity * line.unit_price).toLocaleString("ro-RO")} lei</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Label htmlFor="order-notes">Observații</Label>
            <Textarea id="order-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opțional" rows={2} />
          </div>

          {selectedLines.length > 0 && (
            <div className="text-right text-lg font-bold">
              Total: {total.toLocaleString("ro-RO")} lei
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
            <Button type="submit" disabled={selectedLines.length === 0}>Salvează</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
