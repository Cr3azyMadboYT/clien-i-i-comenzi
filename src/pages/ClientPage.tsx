import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Phone, StickyNote, Filter, History, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderAccordion } from "@/components/OrderAccordion";
import { OrderHistorySection } from "@/components/OrderHistorySection";
import { NewOrderDialog } from "@/components/NewOrderDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchClient,
  fetchProducts,
  fetchClientPrices,
  fetchClientOrders,
  createOrder,
  updatePaidQuantity,
  deleteOrder,
  getOrderStatus,
  getOrderRemainingAmount,
  getOrderRemainingPieces,
} from "@/lib/supabase-helpers";
import { toast } from "sonner";

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: client, error: clientError } = useQuery({ queryKey: ["client", id], queryFn: () => fetchClient(id!), retry: false });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: clientPrices = [] } = useQuery({ queryKey: ["client-prices", id], queryFn: () => fetchClientPrices(id!) });
  const { data: orders = [] } = useQuery({ queryKey: ["client-orders", id], queryFn: () => fetchClientOrders(id!) });

  const activeOrders = useMemo(() => orders.filter((o) => getOrderStatus(o.order_items) !== "achitat"), [orders]);
  const historyOrders = useMemo(() => orders.filter((o) => getOrderStatus(o.order_items) === "achitat"), [orders]);

  const filterOrders = (list: typeof orders) => {
    return list.filter((o) => {
      return o.order_items.some((item) => {
        const name = item.products.name;
        const matchSize = sizeFilter === "all" || name.includes(sizeFilter);
        const matchType = typeFilter === "all" || 
          (typeFilter === "plină" ? name.includes("plină") : name.includes("cu filtru"));
        return matchSize && matchType;
      });
    });
  };

  const filteredActive = filterOrders(activeOrders);
  const filteredHistory = filterOrders(historyOrders);

  const totalDebt = activeOrders.reduce((s, o) => s + getOrderRemainingAmount(o.order_items), 0);
  const totalPieces = activeOrders.reduce((s, o) => s + getOrderRemainingPieces(o.order_items), 0);

  const createOrderMutation = useMutation({
    mutationFn: ({ items, notes, createdAt }: { items: { product_id: string; quantity: number; unit_price: number }[]; notes?: string; createdAt?: string }) =>
      createOrder(id!, items, notes, createdAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["client-prices", id] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      setNewOrderOpen(false);
      toast.success("Comandă salvată");
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("23503") ? "Clientul nu mai există. Reîncarcă pagina." : "Eroare la salvare";
      toast.error(msg);
    },
  });

  const updatePaidMutation = useMutation({
    mutationFn: ({ itemId, newPaid, oldPaid }: { itemId: string; newPaid: number; oldPaid: number }) =>
      updatePaidQuantity(itemId, newPaid, oldPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    },
    onError: () => toast.error("Eroare la actualizare"),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Comanda a fost ștearsă");
    },
    onError: () => toast.error("Eroare la ștergere"),
  });

  if (clientError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Clientul nu a fost găsit sau a fost șters.</p>
        <Button onClick={() => navigate("/")}>Înapoi la lista de clienți</Button>
      </div>
    );
  }

  if (!client) return <div className="p-8 text-center text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{client.name}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
              {client.notes && <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" />{client.notes}</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Client debt summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">De încasat</p>
            <p className="text-xl font-bold debt-text">{totalDebt.toLocaleString("ro-RO")} lei</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">Bucăți rămase</p>
            <p className="text-xl font-bold debt-text">{totalPieces}</p>
          </div>
        </div>

        {/* Action buttons - Înregistrare nouă + Istoric side by side */}
        <div className="flex gap-3 flex-wrap">
          <Button className="flex-1 min-w-[140px] h-11" onClick={() => setNewOrderOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Înregistrare nouă
          </Button>
          <Button
            variant={tab === "history" ? "default" : "outline"}
            className="flex-1 min-w-[140px] h-11"
            onClick={() => setTab(tab === "history" ? "active" : "history")}
          >
            <History className="w-4 h-4 mr-2" /> Istoric ({historyOrders.length})
          </Button>
          {filteredActive.length > 0 && tab === "active" && (
            <Button
              variant="outline"
              className="h-11 px-4"
              onClick={() => setExpandAll(true)}
            >
              <Maximize2 className="w-4 h-4 mr-2" /> Toate pe ecran
            </Button>
          )}
        </div>

        {/* Tab indicator */}
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "active" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("active")}
          >
            Active ({activeOrders.length})
          </button>
          <button
            className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "history" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("history")}
          >
            Istoric ({historyOrders.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Dimensiune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="FI 160">FI 160</SelectItem>
              <SelectItem value="FI 200">FI 200</SelectItem>
              <SelectItem value="FI 250">FI 250</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="plină">Plină</SelectItem>
              <SelectItem value="cu filtru">Cu filtru</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders */}
        {tab === "active" ? (
          filteredActive.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nu există comenzi active.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredActive.map((order) => (
                <OrderAccordion
                  key={order.id}
                  order={order}
                  onUpdatePaid={(itemId, newPaid, oldPaid) => updatePaidMutation.mutate({ itemId, newPaid, oldPaid })}
                  onDelete={(orderId) => deleteOrderMutation.mutate(orderId)}
                />
              ))}
            </div>
          )
        ) : (
          <OrderHistorySection orders={filteredHistory} />
        )}
      </main>

      {/* Expand-all overlay for photo */}
      {expandAll && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{client?.name} — comenzi active</h2>
              <p className="text-xs text-muted-foreground">{filteredActive.length} comenzi · De plată: {totalDebt.toLocaleString("ro-RO")} lei · {totalPieces} buc.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setExpandAll(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className={`p-4 grid gap-3 ${
            filteredActive.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto" :
            filteredActive.length <= 4 ? "grid-cols-2 md:grid-cols-2" :
            filteredActive.length <= 6 ? "grid-cols-2 md:grid-cols-3" :
            "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          }`}>
            {filteredActive.map((order) => {
              const orderStatus = getOrderStatus(order.order_items);
              const orderRemaining = getOrderRemainingAmount(order.order_items);
              const orderPieces = getOrderRemainingPieces(order.order_items);
              const date = new Date(order.created_at);
              return (
                <div key={order.id} className="bg-card rounded-xl border border-border shadow-sm p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {date.toLocaleDateString("ro-RO")} {date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      orderStatus === "achitat" ? "bg-green-100 text-green-700" :
                      orderStatus === "partial" ? "bg-amber-100 text-amber-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>{orderStatus}</span>
                  </div>
                  <div className="space-y-1">
                    {order.order_items.map((item) => {
                      const left = item.quantity - item.paid_quantity;
                      return (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="truncate mr-2">{item.products.name}</span>
                          <span className="shrink-0 font-medium debt-text">{left} buc · {(left * item.unit_price).toLocaleString("ro-RO")} lei</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-1 border-t border-border flex justify-between font-semibold text-xs">
                    <span className="debt-text">De plată: {orderRemaining.toLocaleString("ro-RO")} lei</span>
                    <span className="debt-text">{orderPieces} buc.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <NewOrderDialog
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        products={products}
        clientPrices={clientPrices}
        onSave={(items, notes, createdAt) => createOrderMutation.mutate({ items, notes, createdAt })}
      />
    </div>
  );
}
