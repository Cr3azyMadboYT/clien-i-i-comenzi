import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Product = Tables<"products">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type ClientPrice = Tables<"client_prices">;
export type PaymentHistory = Tables<"payment_history">;

export type OrderWithItems = Order & {
  order_items: (OrderItem & { products: Product })[];
};

// Fetch all products sorted
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

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

// Fetch client prices
export async function fetchClientPrices(clientId: string) {
  const { data, error } = await supabase
    .from("client_prices")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

// Upsert client price
export async function upsertClientPrice(clientId: string, productId: string, price: number) {
  const { error } = await supabase
    .from("client_prices")
    .upsert(
      { client_id: clientId, product_id: productId, custom_price: price },
      { onConflict: "client_id,product_id" }
    );
  if (error) throw error;
}

// Create order with items
export async function createOrder(
  clientId: string,
  items: { product_id: string; quantity: number; unit_price: number }[],
  notes?: string,
  createdAt?: string
) {
  const orderData: { client_id: string; notes?: string; created_at?: string } = { client_id: clientId };
  if (notes) orderData.notes = notes;
  if (createdAt) orderData.created_at = createdAt;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();
  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    paid_quantity: 0,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw itemsError;

  // Update client prices for future orders
  for (const item of items) {
    await upsertClientPrice(clientId, item.product_id, item.unit_price);
  }

  return order;
}

// Fetch orders with items for a client
export async function fetchClientOrders(clientId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as OrderWithItems[];
}

// Fetch all orders with items (for dashboard)
export async function fetchAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))");
  if (error) throw error;
  return data as OrderWithItems[];
}

// Update paid quantity
export async function updatePaidQuantity(orderItemId: string, newPaidQty: number, oldPaidQty: number) {
  const { error: updateError } = await supabase
    .from("order_items")
    .update({ paid_quantity: newPaidQty })
    .eq("id", orderItemId);
  if (updateError) throw updateError;

  const diff = newPaidQty - oldPaidQty;
  if (diff !== 0) {
    const { error: histError } = await supabase
      .from("payment_history")
      .insert({ order_item_id: orderItemId, quantity_paid: diff });
    if (histError) throw histError;
  }
}

// Fetch payment history for an order
export async function fetchPaymentHistory(orderItemIds: string[]) {
  const { data, error } = await supabase
    .from("payment_history")
    .select("*, order_items(*, products(*))")
    .in("order_item_id", orderItemIds)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Delete order
export async function deleteOrder(orderId: string) {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

// Helpers for status calculation
export function getItemStatus(item: OrderItem): "achitat" | "partial" | "neachitat" {
  if (item.paid_quantity >= item.quantity) return "achitat";
  if (item.paid_quantity > 0) return "partial";
  return "neachitat";
}

export function getOrderStatus(items: OrderItem[]): "achitat" | "partial" | "neachitat" {
  const allPaid = items.every((i) => i.paid_quantity >= i.quantity);
  if (allPaid) return "achitat";
  const allUnpaid = items.every((i) => i.paid_quantity === 0);
  if (allUnpaid) return "neachitat";
  return "partial";
}

export function getOrderRemainingAmount(items: (OrderItem & { products?: Product })[]) {
  return items.reduce((sum, i) => sum + (i.quantity - i.paid_quantity) * i.unit_price, 0);
}

export function getOrderRemainingPieces(items: OrderItem[]) {
  return items.reduce((sum, i) => sum + (i.quantity - i.paid_quantity), 0);
}
