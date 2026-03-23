import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, StickyNote, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipeCard } from "@/components/PipeCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  fetchClient,
  fetchProducts,
  fetchClientPrices,
  fetchClientBalances,
  fetchClientHistory,
  updateBalance,
  getClientPrice,
} from "@/lib/supabase-helpers";
import { toast } from "sonner";

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: client, error: clientError } = useQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClient(id!),
    retry: false,
  });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: clientPrices = [] } = useQuery({
    queryKey: ["client-prices", id],
    queryFn: () => fetchClientPrices(id!),
  });
  const { data: balances = [] } = useQuery({
    queryKey: ["client-balances", id],
    queryFn: () => fetchClientBalances(id!),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["client-history", id],
    queryFn: () => fetchClientHistory(id!),
    enabled: historyOpen,
  });

  const balanceMutation = useMutation({
    mutationFn: ({ productId, qty, action }: { productId: string; qty: number; action: "adaugat" | "scazut" }) =>
      updateBalance(id!, productId, qty, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-balances", id] });
      queryClient.invalidateQueries({ queryKey: ["client-history", id] });
      queryClient.invalidateQueries({ queryKey: ["all-balances"] });
      toast.success("Actualizat");
    },
    onError: () => toast.error("Eroare la actualizare"),
  });

  if (clientError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Clientul nu a fost găsit.</p>
        <Button onClick={() => navigate("/")}>Înapoi</Button>
      </div>
    );
  }

  if (!client) return <div className="p-8 text-center text-muted-foreground">Se încarcă...</div>;

  const plainProducts = products.filter((p) => p.name.includes("plină")).sort((a, b) => b.sort_order - a.sort_order);
  const filterProducts = products.filter((p) => p.name.includes("filtru")).sort((a, b) => b.sort_order - a.sort_order);

  function getBalance(productId: string) {
    return balances.find((b) => b.product_id === productId)?.quantity ?? 0;
  }

  function getLastUpdated(productId: string) {
    return balances.find((b) => b.product_id === productId)?.last_updated_at ?? null;
  }

  const totalDebt = products.reduce((sum, p) => {
    const qty = getBalance(p.id);
    const price = getClientPrice(p.id, clientPrices, products);
    return sum + qty * price;
  }, 0);

  const totalPieces = balances.reduce((sum, b) => sum + b.quantity, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{client.name}</h1>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mt-1">
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {client.phone}
                </span>
              )}
              {client.notes && (
                <span className="flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5" />
                  {client.notes}
                </span>
              )}
            </div>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Total summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Total de plată</p>
            <p className="text-2xl font-extrabold text-[hsl(var(--status-paid))]">{totalDebt.toLocaleString("ro-RO")} lei</p>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">Total bucăți</p>
            <p className="text-2xl font-extrabold text-destructive">{totalPieces}</p>
          </div>
        </div>

        {/* History button - above the 6 cards */}
        <Button
          className="w-full h-14 text-lg font-bold bg-foreground text-background hover:bg-foreground/90"
          onClick={() => setHistoryOpen(true)}
        >
          <History className="w-6 h-6 mr-2" />
          Istoric
        </Button>

        {/* Column headers + cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-foreground uppercase tracking-wide text-center">Țevi pline</h2>
            {plainProducts.map((product) => {
              const qty = getBalance(product.id);
              const price = getClientPrice(product.id, clientPrices, products);
              return (
                <PipeCard
                  key={product.id}
                  productName={product.name}
                  quantity={qty}
                  amount={qty * price}
                  lastUpdated={getLastUpdated(product.id)}
                  onAdd={(q) => balanceMutation.mutate({ productId: product.id, qty: q, action: "adaugat" })}
                  onSubtract={(q) => balanceMutation.mutate({ productId: product.id, qty: q, action: "scazut" })}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-foreground uppercase tracking-wide text-center">Țevi cu filtru</h2>
            {filterProducts.map((product) => {
              const qty = getBalance(product.id);
              const price = getClientPrice(product.id, clientPrices, products);
              return (
                <PipeCard
                  key={product.id}
                  productName={product.name}
                  quantity={qty}
                  amount={qty * price}
                  lastUpdated={getLastUpdated(product.id)}
                  onAdd={(q) => balanceMutation.mutate({ productId: product.id, qty: q, action: "adaugat" })}
                  onSubtract={(q) => balanceMutation.mutate({ productId: product.id, qty: q, action: "scazut" })}
                />
              );
            })}
          </div>
        </div>
      </main>

      {/* History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">Istoric modificări</DialogTitle>
            <DialogDescription>Toate acțiunile pentru {client.name}</DialogDescription>
          </DialogHeader>

          {history.length === 0 ? (
            <p className="text-base text-muted-foreground text-center py-6">Nu există istoric.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => {
                const date = new Date(h.created_at);
                const isAdd = h.action_type === "adaugat";
                return (
                  <div
                    key={h.id}
                    className="bg-secondary/50 rounded-lg border border-border px-4 py-3 flex items-center gap-3"
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isAdd
                          ? "bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid))]"
                          : "bg-[hsl(var(--status-unpaid-bg))] text-[hsl(var(--status-unpaid))]"
                      }`}
                    >
                      {isAdd ? "+" : "−"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">
                        {isAdd ? "Adăugat" : "Scăzut"} {h.quantity}{" "}
                        {h.quantity === 1 ? "bucată" : "bucăți"} {h.products.name}
                      </p>
                      <p className="text-sm font-medium text-muted-foreground">
                        {date.toLocaleDateString("ro-RO")}{" "}
                        {date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
