export type Category = "kids" | "meditation" | "abundance";

export interface Book {
  id: string;
  title: string;
  eyebrow: string;
  author: string;
  price: number;
  description: string;
  quote: string;
  cover?: string;
  coverClass: string;
  subtitle: string;
  category: Category;
  pages: [string, string][];
}

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
