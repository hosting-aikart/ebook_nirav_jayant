import type { Book, Category, Language } from "./data/books";
export type { Book, Category, Language };

export interface CartItem {
  book: Book;
  quantity: number;
}
