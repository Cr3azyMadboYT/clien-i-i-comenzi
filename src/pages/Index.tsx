import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Phone, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DashboardCards } from "@/components/DashboardCards";
import { ClientDialog } from "@/components/ClientDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchClients,
  fetchAllBalances,
  fetchProducts,
  createClient,
  updateClient,
  deleteClient,
  type Client,
} from "@/lib/supabase-helpers";
import { toast } from "sonner";

export default function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: allBalances = [] } = useQuery({ queryKey: ["all-balances"], queryFn: fetchAllBalances });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string; notes?: string }) => createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      toast.success("Client adăugat");
    },
    onError: () => toast.error("Eroare la adăugare"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; phone?: string | null; notes?: string | null } }) =>
      updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setEditingClient(null);
      toast.success("Client actualizat");
    },
    onError: () => toast.error("Eroare la actualizare"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["all-balances"] });
      toast.success("Client șters");
    },
    onError: () => toast.error("Eroare la ștergere"),
  });

  // Calculate totals from balances
  const totalDebt = allBalances.reduce((sum, b) => {
    const price = Number(b.products?.base_price ?? 0);
    return sum + b.quantity * price;
  }, 0);
  const totalUnpaidPieces = allBalances.reduce((sum, b) => sum + b.quantity, 0);

  // Per-client debt
  const clientDebt = new Map<string, { amount: number; pieces: number }>();
  allBalances.forEach((b) => {
    const prev = clientDebt.get(b.client_id) || { amount: 0, pieces: 0 };
    const price = Number(b.products?.base_price ?? 0);
    prev.amount += b.quantity * price;
    prev.pieces += b.quantity;
    clientDebt.set(b.client_id, prev);
  });

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  function handleSave(data: { name: string; phone?: string; notes?: string }) {
    if (editingClient) {
      updateMutation.mutate({
        id: editingClient.id,
        data: { name: data.name, phone: data.phone || null, notes: data.notes || null },
      });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Evidență Clienți</h1>
          <p className="text-sm text-muted-foreground">Gestiune vânzări țeavă</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <DashboardCards totalClients={clients.length} totalDebt={totalDebt} totalUnpaidPieces={totalUnpaidPieces} />

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Caută după nume sau telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => { setEditingClient(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Adaugă client
          </Button>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nu există clienți.</p>
          ) : (
            filtered.map((client) => {
              const debt = clientDebt.get(client.id);
              return (
                <div
                  key={client.id}
                  className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.995]"
                  onClick={() => navigate(`/client/${client.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    {client.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </p>
                    )}
                    {debt && debt.amount > 0 && (
                      <p className="text-xs font-semibold debt-text mt-0.5">
                        De plată: {debt.amount.toLocaleString("ro-RO")} lei • {debt.pieces} buc.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setEditingClient(client); setDialogOpen(true); }}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Șterge clientul?</AlertDialogTitle>
                          <AlertDialogDescription>Toate datele clientului vor fi șterse.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(client.id)}>Șterge</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingClient(null); }}
        client={editingClient}
        onSave={handleSave}
      />
    </div>
  );
}
