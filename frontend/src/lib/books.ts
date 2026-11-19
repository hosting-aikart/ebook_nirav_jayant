import { fallbackBooks, type Book, type Category, type Language } from "../data/books";
import { supabase } from "./supabase";

/** Shape of a row in the `books` table. */
export type BookRow = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  author: string;
  price: number;
  description: string;
  quote: string;
  cover: string | null;
  cover_class: string;
  category: Category;
  pages: [string, string][];
  preview_images: string[];
  about: string[];
  highlights: string[];
  pdf_path: string | null;
  is_active: boolean;
  featured: boolean;
  language: Language;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    eyebrow: row.eyebrow,
    author: row.author,
    price: row.price,
    description: row.description,
    quote: row.quote,
    about: row.about?.length ? row.about : undefined,
    highlights: row.highlights?.length ? row.highlights : undefined,
    cover: row.cover || undefined,
    coverClass: row.cover_class,
    category: row.category,
    previewImages: row.preview_images?.length ? row.preview_images : undefined,
    featured: row.featured,
    language: row.language,
    // The reader needs at least one page to render.
    pages: row.pages?.length ? row.pages : [[row.title, row.description]],
  };
}

export async function fetchBooks(): Promise<Book[]> {
  if (!supabase) return fallbackBooks;
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (error || !data?.length) {
    if (error) console.error("Could not load books, using fallback:", error.message);
    return fallbackBooks;
  }
  return (data as BookRow[]).map(rowToBook);
}
