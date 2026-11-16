import { PrismaClient, OrderStatus } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL || "";

export const isDbConfigured = Boolean(
  dbUrl &&
  !dbUrl.includes("YOUR_NEON_POSTGRES_URL") &&
  !dbUrl.includes("placeholder")
);

export const prisma = isDbConfigured ? new PrismaClient() : null;

export interface SaveOrderPayload {
  orderId: string;
  amount: number; // in paise
  currency: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: {
    id: string;
    title: string;
    price: number;
    quantity: number;
  }[];
}

// In-memory fallback if Neon connection string is not yet configured
const inMemoryOrders = new Map<string, any>();

export async function saveOrder(payload: SaveOrderPayload) {
  if (isDbConfigured && prisma) {
    try {
      // 1. Upsert customer by unique email
      const customer = await prisma.customer.upsert({
        where: { email: payload.customer.email.toLowerCase().trim() },
        update: {
          name: payload.customer.name.trim(),
          phone: payload.customer.phone?.trim() || undefined,
        },
        create: {
          name: payload.customer.name.trim(),
          email: payload.customer.email.toLowerCase().trim(),
          phone: payload.customer.phone?.trim() || null,
        },
      });

      // 2. Create the Order with nested OrderItems
      const order = await prisma.order.create({
        data: {
          razorpayOrderId: payload.orderId,
          amount: payload.amount,
          currency: payload.currency,
          status: OrderStatus.CREATED,
          customerId: customer.id,
          items: {
            create: payload.items.map((item) => ({
              bookId: item.id,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      return order;
    } catch (error) {
      console.error("[Database] Error saving order to PostgreSQL:", error);
      throw error;
    }
  }

  // Fallback to in-memory store
  const stored = {
    orderId: payload.orderId,
    amount: payload.amount,
    currency: payload.currency,
    status: "CREATED",
    customer: payload.customer,
    items: payload.items,
    createdAt: new Date().toISOString(),
  };
  inMemoryOrders.set(payload.orderId, stored);
  return stored;
}

export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  if (isDbConfigured && prisma) {
    try {
      const updated = await prisma.order.update({
        where: { razorpayOrderId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: OrderStatus.PAID,
        },
        include: {
          customer: true,
          items: true,
        },
      });
      return updated;
    } catch (error) {
      console.error("[Database] Error updating order status in PostgreSQL:", error);
      throw error;
    }
  }

  // Fallback to in-memory store
  const order = inMemoryOrders.get(razorpayOrderId);
  if (order) {
    order.status = "PAID";
    order.paymentId = razorpayPaymentId;
    order.signature = razorpaySignature;
    inMemoryOrders.set(razorpayOrderId, order);
  }
  return order;
}

export async function findOrder(orderId: string) {
  if (isDbConfigured && prisma) {
    try {
      return await prisma.order.findUnique({
        where: { razorpayOrderId: orderId },
        include: {
          customer: true,
          items: true,
        },
      });
    } catch (error) {
      console.error("[Database] Error retrieving order from PostgreSQL:", error);
      throw error;
    }
  }

  return inMemoryOrders.get(orderId) || null;
}
