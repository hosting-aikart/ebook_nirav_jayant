import { useCallback, useEffect, useRef, useState } from "react";
import type { Book } from "../data/books";
import type { CartItem } from "../types";
import { MAX_COPIES, type OrderReceipt } from "./checkout";

const BAG_KEY = "still_cart";

function readBag(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(BAG_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((item) => item?.book?.id && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

/**
 * The shopping bag, shared by every storefront page and saved in localStorage.
 * Pass the loaded catalogue: bag items are refreshed from it (latest price/title)
 * and books that were removed from the store drop out of the bag.
 */
export function useBag(catalog: Book[]) {
  const [items, setItems] = useState<CartItem[]>(readBag);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(items));
    } catch {
      /* storage full or disabled: the bag still works for this visit */
    }
  }, [items]);

  useEffect(() => {
    if (!catalog.length) return;
    const byId = new Map(catalog.map((book) => [book.id, book]));
    setItems((prev) =>
      prev.flatMap((item) => {
        const book = byId.get(item.book.id);
        return book ? [{ book, quantity: Math.min(item.quantity, MAX_COPIES) }] : [];
      }),
    );
  }, [catalog]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const add = useCallback((book: Book) => {
    setItems((prev) =>
      prev.some((item) => item.book.id === book.id)
        ? prev.map((item) =>
            item.book.id === book.id ? { ...item, quantity: Math.min(item.quantity + 1, MAX_COPIES) } : item,
          )
        : [...prev, { book, quantity: 1 }],
    );
    setToast(`"${book.title}" added to your bag`);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const setQuantity = useCallback((bookId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.book.id !== bookId)
        : prev.map((item) => (item.book.id === bookId ? { ...item, quantity: Math.min(quantity, MAX_COPIES) } : item)),
    );
  }, []);

  const remove = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((item) => item.book.id !== bookId));
  }, []);

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.book.price * item.quantity, 0),
    isOpen,
    open: useCallback(() => {
      setToast(null);
      setIsOpen(true);
    }, []),
    close: useCallback(() => setIsOpen(false), []),
    add,
    setQuantity,
    remove,
    clear: useCallback(() => setItems([]), []),
    toast,
    /** The "Order confirmed" screen, shown after a successful payment. */
    receipt,
    showReceipt: setReceipt,
    closeReceipt: useCallback(() => setReceipt(null), []),
  };
}

export type Bag = ReturnType<typeof useBag>;
