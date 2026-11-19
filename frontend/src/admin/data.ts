import { supabase } from "../lib/supabase";

export type OrderRow = {
  id: string;
  book_id: string;
  book_title: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  customers: { name: string; email: string; phone: string | null } | null;
  ship_name: string | null;
  ship_phone: string | null;
  ship_address: string | null;
  ship_city: string | null;
  ship_state: string | null;
  ship_pincode: string | null;
  delivery_status: DeliveryStatus;
  tracking_info: string | null;
  shipped_at: string | null;
};

export type DeliveryStatus = "to_ship" | "shipped" | "delivered" | "cancelled";
export const deliveryLabels: Record<DeliveryStatus, string> = {
  to_ship: "To ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function updateDelivery(
  id: string,
  patch: { delivery_status?: DeliveryStatus; tracking_info?: string | null },
) {
  const extra = patch.delivery_status === "shipped" ? { shipped_at: new Date().toISOString() } : {};
  const { error } = await supabase!.from("orders").update({ ...patch, ...extra }).eq("id", id);
  if (error) throw error;
}

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders: { amount: number; status: string; book_title: string }[];
};

export async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase!
    .from("orders")
    .select("*, customers(name, email, phone)")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data as unknown as OrderRow[];
}

export async function fetchCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await supabase!
    .from("customers")
    .select("*, orders(amount, status, book_title)")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data as unknown as CustomerRow[];
}
