import { CartItem, CustomerDetails, OrderConfirmation } from "../types";

export interface CreateOrderResponse {
  orderId: string;
  amount: number; // in paise
  amountInRupees: number;
  currency: string;
  keyId: string;
  isMock: boolean;
  customer: CustomerDetails;
  items: { id: string; title: string; price: number; quantity: number }[];
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createOrder(
  cart: CartItem[],
  customer: CustomerDetails
): Promise<CreateOrderResponse> {
  const items = cart.map((item) => ({
    id: item.book.id,
    quantity: item.quantity,
  }));

  const response = await fetch("/api/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items, customer }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to initiate payment order");
  }

  return data;
}

export async function verifyPayment(
  payload: VerifyPaymentPayload
): Promise<OrderConfirmation> {
  const response = await fetch("/api/verify-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Payment verification failed");
  }

  return data;
}
