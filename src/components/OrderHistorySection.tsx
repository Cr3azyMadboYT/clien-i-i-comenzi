import type { OrderWithItems } from "@/lib/supabase-helpers";

interface OrderHistorySectionProps {
  orders: OrderWithItems[];
}

export function OrderHistorySection({ orders }: OrderHistorySectionProps) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nu există comenzi achitate.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const date = new Date(order.created_at);
        const total = order.order_items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
        
        return (
          <div key={order.id} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium">
                {date.toLocaleDateString("ro-RO")} {date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="status-paid inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">Achitat</span>
            </div>
            <div className="space-y-1">
              {order.order_items.map((item) => (
                <p key={item.id} className="text-xs text-muted-foreground">
                  {item.quantity}x {item.products.name} — {(item.quantity * item.unit_price).toLocaleString("ro-RO")} lei
                </p>
              ))}
            </div>
            <p className="text-sm font-semibold mt-2">Total: {total.toLocaleString("ro-RO")} lei</p>
          </div>
        );
      })}
    </div>
  );
}
