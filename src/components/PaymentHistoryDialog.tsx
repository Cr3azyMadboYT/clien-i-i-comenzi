import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchPaymentHistory } from "@/lib/supabase-helpers";

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItemIds: string[];
}

type HistoryEntry = {
  id: string;
  quantity_paid: number;
  paid_at: string;
  order_items: { products: { name: string } };
};

export function PaymentHistoryDialog({ open, onOpenChange, orderItemIds }: PaymentHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderItemIds.length > 0) {
      setLoading(true);
      fetchPaymentHistory(orderItemIds)
        .then((data) => setHistory(data as unknown as HistoryEntry[]))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, orderItemIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Istoric plăți</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Se încarcă...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nu există plăți înregistrate.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const d = new Date(h.paid_at);
              return (
                <div key={h.id} className="bg-muted/40 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{h.order_items.products.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {h.quantity_paid > 0 ? `+${h.quantity_paid}` : h.quantity_paid} bucăți {h.quantity_paid > 0 ? "achitate" : "anulate"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("ro-RO")} {d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
