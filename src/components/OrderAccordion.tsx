import { useState } from "react";
import { ChevronDown, Trash2, History, Plus, Minus, CheckCheck, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { OrderWithItems } from "@/lib/supabase-helpers";
import { getOrderStatus, getOrderRemainingAmount, getOrderRemainingPieces } from "@/lib/supabase-helpers";

interface OrderAccordionProps {
  order: OrderWithItems;
  onUpdatePaid: (orderItemId: string, newPaid: number, oldPaid: number) => void;
  onDelete: (orderId: string) => void;
}

export function OrderAccordion({ order, onUpdatePaid, onDelete }: OrderAccordionProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const status = getOrderStatus(order.order_items);
  const remaining = getOrderRemainingAmount(order.order_items);
  const remainingPieces = getOrderRemainingPieces(order.order_items);
  const date = new Date(order.created_at);

  const productSummary = order.order_items
    .map((i) => `${i.quantity}x ${i.products.name}`)
    .join(", ");

  return (
    <>
      {/* Zoom overlay */}
      {zoomed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setZoomed(false)} />
      )}

      <div className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300 ${
        zoomed
          ? "fixed inset-4 sm:inset-8 md:inset-16 z-50 overflow-y-auto text-lg shadow-2xl"
          : ""
      }`}>
        {/* Header */}
        <div className="flex items-start">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`flex-1 text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors active:scale-[0.99] ${zoomed ? "p-6" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`font-medium text-foreground ${zoomed ? "text-lg" : "text-sm"}`}>
                  {date.toLocaleDateString("ro-RO")} {date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <StatusBadge status={status} />
              </div>
              <p className={`text-muted-foreground truncate ${zoomed ? "text-base" : "text-xs"}`}>{productSummary}</p>
              {remaining > 0 && (
                <div className="flex gap-4 mt-1.5">
                  <span className={`font-semibold debt-text ${zoomed ? "text-lg" : "text-sm"}`}>De plată: {remaining.toLocaleString("ro-RO")} lei</span>
                  <span className={`font-semibold debt-text ${zoomed ? "text-lg" : "text-sm"}`}>{remainingPieces} buc. rămase</span>
                </div>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="mt-3 mr-2 shrink-0"
            onClick={() => setZoomed(!zoomed)}
            title={zoomed ? "Micșorează" : "Mărește pentru poză"}
          >
            {zoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Body */}
        {open && (
          <div className={`border-t border-border px-4 pb-4 pt-3 space-y-3 ${zoomed ? "px-6 pb-6 pt-4 space-y-4" : ""}`}>
            {order.notes && (
              <p className={`text-muted-foreground italic ${zoomed ? "text-base" : "text-xs"}`}>Obs: {order.notes}</p>
            )}

            {order.order_items.map((item) => {
              const itemRemaining = (item.quantity - item.paid_quantity) * item.unit_price;
              const piecesLeft = item.quantity - item.paid_quantity;

              return (
                <div key={item.id} className={`bg-muted/40 rounded-lg ${zoomed ? "p-4" : "p-3"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${zoomed ? "text-lg" : "text-sm"}`}>{item.products.name}</span>
                    <StatusBadge status={item.paid_quantity >= item.quantity ? "achitat" : item.paid_quantity > 0 ? "partial" : "neachitat"} />
                  </div>
                  <div className={`text-muted-foreground space-y-0.5 ${zoomed ? "text-base" : "text-xs"}`}>
                    <p>Bucăți rămase: <span className="font-semibold debt-text">{piecesLeft}</span> din {item.quantity}</p>
                    <p>Preț bucată: {item.unit_price.toLocaleString("ro-RO")} lei</p>
                    <p>De plată: <span className="font-semibold debt-text">{itemRemaining.toLocaleString("ro-RO")} lei</span></p>
                  </div>
                  {!zoomed && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Button variant="outline" size="sm" className="h-8 px-2" disabled={item.paid_quantity <= 0} onClick={() => onUpdatePaid(item.id, item.paid_quantity - 1, item.paid_quantity)}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-sm font-medium w-16 text-center">{item.paid_quantity} / {item.quantity}</span>
                      <Button variant="outline" size="sm" className="h-8 px-2" disabled={item.paid_quantity >= item.quantity} onClick={() => onUpdatePaid(item.id, item.paid_quantity + 1, item.paid_quantity)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={item.paid_quantity >= item.quantity} onClick={() => onUpdatePaid(item.id, item.quantity, item.paid_quantity)}>
                        <CheckCheck className="w-3.5 h-3.5 mr-1" /> Achită tot
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={item.paid_quantity === 0} onClick={() => onUpdatePaid(item.id, 0, item.paid_quantity)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Resetează
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {!zoomed && (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                  <History className="w-4 h-4 mr-1" /> Istoric
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="debt-text">
                      <Trash2 className="w-4 h-4 mr-1" /> Șterge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Șterge comanda?</AlertDialogTitle>
                      <AlertDialogDescription>Această acțiune este ireversibilă.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anulează</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(order.id)}>Șterge</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        )}
      </div>

      <PaymentHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        orderItemIds={order.order_items.map((i) => i.id)}
      />
    </>
  );
}
