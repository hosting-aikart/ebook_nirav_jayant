import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { CATALOG } from "./books.js";
import {
  isConfigured,
  razorpayInstance,
  getRazorpayKeyId,
  verifyPaymentSignature,
} from "./razorpay.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

interface CartItemInput {
  id: string;
  quantity?: number;
}

interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
}

interface StoredOrder {
  orderId: string;
  amount: number; // in paise
  currency: string;
  status: "created" | "paid" | "failed";
  customer: CustomerInput;
  items: { id: string; title: string; price: number; quantity: number }[];
  paymentId?: string;
  createdAt: string;
}

// In-memory order store
const ordersDatabase = new Map<string, StoredOrder>();

// Health check & status
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    razorpayConfigured: isConfigured,
    message: isConfigured
      ? "Razorpay is configured with active credentials."
      : "Running in mock/developer mode. Set valid RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in backend/.env to connect to Razorpay.",
  });
});

// Public configuration for frontend checkout
app.get("/api/config", (_req: Request, res: Response) => {
  res.json({
    keyId: getRazorpayKeyId(),
    isMock: !isConfigured,
    currency: "INR",
    storeName: "STILL. — Sw. Nirav Jayant",
  });
});

// Create Razorpay Order
app.post("/api/create-order", async (req: Request, res: Response) => {
  try {
    const { items, customer } = req.body as {
      items?: CartItemInput[];
      customer?: CustomerInput;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Your bag is empty. Please add at least one e-book." });
      return;
    }

    if (!customer?.email || !customer?.name) {
      res.status(400).json({ error: "Please provide a valid name and email address for e-book delivery." });
      return;
    }

    // Verify items against catalog and calculate total server-side
    const verifiedItems: { id: string; title: string; price: number; quantity: number }[] = [];
    let totalRupees = 0;

    for (const item of items) {
      const book = CATALOG[item.id];
      if (!book) {
        res.status(400).json({ error: `E-book with ID "${item.id}" was not found.` });
        return;
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      verifiedItems.push({
        id: book.id,
        title: book.title,
        price: book.price,
        quantity: qty,
      });
      totalRupees += book.price * qty;
    }

    const totalPaise = totalRupees * 100;
    const receiptId = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    let orderId = "";

    if (isConfigured && razorpayInstance) {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: totalPaise,
        currency: "INR",
        receipt: receiptId,
        notes: {
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || "",
          books: verifiedItems.map((b) => b.title).join(", "),
        },
      });
      orderId = razorpayOrder.id;
    } else {
      // Mock order ID for local test mode
      orderId = `order_mock_${Date.now()}`;
      console.log(`[STILL Backend] Mock order generated: ${orderId} for ₹${totalRupees}`);
    }

    const storedOrder: StoredOrder = {
      orderId,
      amount: totalPaise,
      currency: "INR",
      status: "created",
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone?.trim(),
      },
      items: verifiedItems,
      createdAt: new Date().toISOString(),
    };

    ordersDatabase.set(orderId, storedOrder);

    res.json({
      orderId,
      amount: totalPaise,
      amountInRupees: totalRupees,
      currency: "INR",
      keyId: getRazorpayKeyId(),
      isMock: !isConfigured,
      customer: storedOrder.customer,
      items: verifiedItems,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      error: "Unable to initiate payment order.",
      details: error?.message || error,
    });
  }
});

// Verify Payment Signature
app.post("/api/verify-payment", (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      res.status(400).json({ error: "Missing required payment verification details." });
      return;
    }

    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature || ""
    );

    if (!isValid) {
      console.warn(`[STILL Backend] Invalid payment signature for order: ${razorpay_order_id}`);
      res.status(400).json({
        success: false,
        error: "Payment verification failed. Invalid cryptographic signature.",
      });
      return;
    }

    const existingOrder = ordersDatabase.get(razorpay_order_id);
    if (existingOrder) {
      existingOrder.status = "paid";
      existingOrder.paymentId = razorpay_payment_id;
      ordersDatabase.set(razorpay_order_id, existingOrder);
    }

    // Mock download access links for purchased e-books
    const downloads = (existingOrder?.items || []).map((item) => ({
      id: item.id,
      title: item.title,
      pdfUrl: `/downloads/${item.id}.pdf`,
      epubUrl: `/downloads/${item.id}.epub`,
    }));

    res.json({
      success: true,
      message: "Payment successfully verified. Thank you for your purchase!",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      customer: existingOrder?.customer,
      items: existingOrder?.items,
      downloads,
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      error: "An unexpected error occurred during payment verification.",
      details: error?.message || error,
    });
  }
});

// Retrieve Order by ID
app.get("/api/orders/:orderId", (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const order = ordersDatabase.get(orderId);

  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }

  res.json(order);
});

app.listen(PORT, () => {
  console.log(`✨ STILL E-book backend running on http://localhost:${PORT}`);
  console.log(
    isConfigured
      ? `🔒 Razorpay integrated with Key ID: ${getRazorpayKeyId()}`
      : `⚠️ Razorpay running in mock/demo mode. Add live/test credentials in backend/.env to connect real payments.`
  );
});
