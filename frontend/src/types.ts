import type { Book, Category, Language } from "./data/books";
export type { Book, Category, Language };

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
}

export interface DownloadLink {
  id: string;
  title: string;
  pdfUrl: string;
  epubUrl: string;
}

export interface OrderConfirmation {
  orderId: string;
  paymentId: string;
  customer: CustomerDetails;
  items: { id: string; title: string; price: number; quantity: number }[];
  downloads: DownloadLink[];
  totalAmount?: number;
}
