import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Product = Tables<"products">;
export type ClientBalance = Tables<"client_balances">;
export type ClientHistory = Tables<"client_history">;
export type ClientPrice = Tables<"client_prices">;

// Fetch all clients
export async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

// Fetch a single client
export async function fetchClient(id: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Create client
export async function createClient(client: { name: string; phone?: string; notes?: string }) {
  const { data, error } = await supabase
    .from("clients")
    .insert(client)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update client
export async function updateClient(id: string, client: { name?: string; phone?: string | null; notes?: string | null }) {
  const { data, error } = await supabase
    .from("clients")
    .update(client)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete client
export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// Fetch all products sorted
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

// Fetch client balances
export async function fetchClientBalances(clientId: string) {
  const { data, error } = await supabase
    .from("client_balances")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

// Fetch all balances (for dashboard totals)
export async function fetchAllBalances() {
  const { data, error } = await supabase
    .from("client_balances")
    .select("*, products(*)");
  if (error) throw error;
  return data as (ClientBalance & { products: Product })[];
}

// Fetch client prices
export async function fetchClientPrices(clientId: string) {
  const { data, error } = await supabase
    .from("client_prices")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

// Update balance (add or subtract)
export async function updateBalance(
  clientId: string,
  productId: string,
  quantity: number,
  actionType: "adaugat" | "scazut"
) {
  // Get current balance
  const { data: existing } = await supabase
    .from("client_balances")
    .select("*")
    .eq("client_id", clientId)
    .eq("product_id", productId)
    .maybeSingle();

  const currentQty = existing?.quantity ?? 0;
  const newQty = actionType === "adaugat"
    ? currentQty + quantity
    : Math.max(0, currentQty - quantity);

  // Upsert balance
  const { error: balError } = await supabase
    .from("client_balances")
    .upsert(
      {
        client_id: clientId,
        product_id: productId,
        quantity: newQty,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,product_id" }
    );
  if (balError) throw balError;

  // Insert history
  const { error: histError } = await supabase
    .from("client_history")
    .insert({
      client_id: clientId,
      product_id: productId,
      action_type: actionType,
      quantity,
    });
  if (histError) throw histError;
}

// Fetch client history
export async function fetchClientHistory(clientId: string) {
  const { data, error } = await supabase
    .from("client_history")
    .select("*, products(*)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as (ClientHistory & { products: Product })[];
}

// Get price for a client+product
export function getClientPrice(
  productId: string,
  clientPrices: ClientPrice[],
  products: Product[]
): number {
  const cp = clientPrices.find((p) => p.product_id === productId);
  if (cp) return Number(cp.custom_price);
  const prod = products.find((p) => p.id === productId);
  return prod ? Number(prod.base_price) : 0;
}
