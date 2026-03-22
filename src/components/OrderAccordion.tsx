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

  const MAX_SHOWN = 2;
  const productSummary = order.order_items.length <= MAX_SHOWN
    ? order.order_items.map((i) => `${i.quantity}x ${i.products.name}`).join(", ")
    : order.order_items.slice(0, MAX_SHOWN).map((i) => `${i.quantity}x ${i.products.name}`).join(", ") +
      ` +${order.order_items.length - MAX_SHOWN} produse`;

  const hasManyItems = order.order_items.length >= 4;
  const hasMaxItems = order.order_items.length >= 6;
  const zoomCardWidth = hasMaxItems
    ? "w-[96vw] md:w-[90vw] lg:w-[84vw] max-w-6xl"
    : hasManyItems
      ? "w-[96vw] md:w-[86vw] lg:w-[74vw] max-w-5xl"
      : "w-[94vw] md:w-[72vw] lg:w-[56vw] max-w-4xl";

  return (
    <>
      {zoomed && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40" onClick={() => setZoomed(false)} />
      )}

      <div className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300 ${
        zoomed
          ? `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${zoomCardWidth} max-h-[92vh] overflow-hidden shadow-2xl`
          : ""
      }`}>
        <div className="flex items-start">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`flex-1 text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors active:scale-[0.99] ${
              zoomed ? (hasMaxItems ? "p-4" : "p-5") : ""
            }`}
          >
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className={`flex items-center gap-2 mb-1 ${zoomed ? "flex-nowrap" : "flex-wrap"}`}>
                <span className={`font-medium text-foreground shrink-0 ${zoomed ? (hasMaxItems ? "text-base" : "text-lg") : "text-sm"}`}>
                  {date.toLocaleDateString("ro-RO")} {date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <StatusBadge status={status} />
              </div>
              <p className={`text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap ${zoomed ? "text-sm" : "text-xs"}`}>
                {productSummary}
              </p>
              {remaining > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  <span className={`font-semibold debt-text ${zoomed ? (hasMaxItems ? "text-base" : "text-lg") : "text-sm"}`}>
                    De plată: {remaining.toLocaleString("ro-RO")} lei
                  </span>
                  <span className={`font-semibold debt-text ${zoomed ? (hasMaxItems ? "text-base" : "text-lg") : "text-sm"}`}>
                    {remainingPieces} buc. rămase
                  </span>
                </div>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${(open || zoomed) ? "rotate-180" : ""}`} />
          </button>

          <Button
            variant={zoomed ? "default" : "ghost"}
            size="sm"
            className={`mt-3 mr-3 shrink-0 ${zoomed ? "h-10 px-3" : "h-8 px-2"}`}
            onClick={() => {
              if (zoomed) {
                setZoomed(false);
                return;
              }
              setOpen(true);
              setZoomed(true);
            }}
            title={zoomed ? "Revino" : "Tot pe ecran"}
          >
            {zoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">{zoomed ? "Revino" : "Tot pe ecran"}</span>
          </Button>
        </div>

        {(open || zoomed) && (
          <div className={`border-t border-border ${
            zoomed
              ? hasMaxItems
                ? "px-4 pb-4 pt-3"
                : "px-5 pb-5 pt-4"
              : "px-4 pb-4 pt-3"
          }`}>
            {order.notes && (
              <p className={`text-muted-foreground italic mb-3 ${zoomed ? "text-sm" : "text-xs"}`}>
                Obs: {order.notes}
              </p>
            )}

            <div className={zoomed ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"}>
              {order.order_items.map((item) => {
                const itemRemaining = (item.quantity - item.paid_quantity) * item.unit_price;
                const piecesLeft = item.quantity - item.paid_quantity;

                return (
                  <div key={item.id} className={`bg-muted/40 rounded-lg h-full ${zoomed ? (hasMaxItems ? "p-3" : "p-4") : "p-3"}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`font-medium min-w-0 break-words ${zoomed ? (hasMaxItems ? "text-base" : "text-lg") : "text-sm"}`}>
                        {item.products.name}
                      </span>
                      <StatusBadge status={item.paid_quantity >= item.quantity ? "achitat" : item.paid_quantity > 0 ? "partial" : "neachitat"} />
                    </div>
                    <div className={`text-muted-foreground space-y-0.5 ${zoomed ? (hasMaxItems ? "text-sm" : "text-base") : "text-xs"}`}>
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
            </div>

            {!zoomed && (
              <div className="flex gap-2 pt-3">
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
