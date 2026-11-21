import { adminApi } from "./session";

export type OrderItemRow = { title: string; quantity: number; unit_price: number; position: number };

export type OrderRow = {
  id: string;
  /** Set only when the order has a single title. */
  book_id: string | null;
  /** Readable summary of every book in the order, e.g. "Playing with Breath × 2, Moneytuition". */
  book_title: string;
  order_items: OrderItemRow[];
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  /** Why the last payment attempt failed (from Razorpay). */
  payment_error: string | null;
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
  // The server sets shipped_at when the status becomes "shipped".
  await adminApi(`/orders/${id}`, { method: "PATCH", body: patch });
}

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders: { amount: number; status: string; book_title: string }[];
};

/** Newest first, each with its customer and line items (in bag order). */
export const fetchOrders = () => adminApi<OrderRow[]>("/orders");

export const fetchCustomers = () => adminApi<CustomerRow[]>("/customers");
