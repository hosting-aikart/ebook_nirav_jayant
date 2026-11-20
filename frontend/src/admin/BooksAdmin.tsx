import { useEffect, useState, type FormEvent } from "react";
import { categories, languages, type Category, type Language } from "../data/books";
import type { BookRow } from "../lib/books";
import { supabase } from "../lib/supabase";
import { Button, Card, Input, Label, Select, Textarea, inr } from "./ui";

const emptyBook: BookRow = {
  id: "",
  title: "",
  subtitle: "",
  eyebrow: "",
  author: "Sw. Nirav Jayant",
  price: 499,
  description: "",
  quote: "",
  cover: null,
  cover_class: "",
  category: "meditation",
  pages: [["", ""]],
  preview_images: [],
  about: [],
  highlights: [],
  pdf_path: null,
  is_active: true,
  featured: false, // new books go on the Bookshelf page only, until ticked
  language: "English",
  sort_order: 100,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const fileExt = (f: File) => f.name.split(".").pop()?.toLowerCase() || "bin";

export default function BooksAdmin() {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [editing, setEditing] = useState<{ book: BookRow; isNew: boolean } | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const { data, error } = await supabase!.from("books").select("*").order("sort_order").order("created_at");
    if (error) setError(error.message);
    else setBooks(data as BookRow[]);
  };
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (book: BookRow) => {
    const { error } = await supabase!.from("books").update({ is_active: !book.is_active }).eq("id", book.id);
    if (error) alert(error.message);
    load();
  };

  const remove = async (book: BookRow) => {
    if (!confirm(`Delete "${book.title}" permanently?`)) return;
    const { error } = await supabase!.from("books").delete().eq("id", book.id);
    if (error) {
      alert(
        error.code === "23503"
          ? "This book has orders, so it can't be deleted (customer records must be kept). Use “Hide” instead to remove it from the website."
          : error.message,
      );
      return;
    }
    if (book.pdf_path) await supabase!.storage.from("ebooks").remove([book.pdf_path]);
    load();
  };

  if (editing) {
    return (
      <BookForm
        initial={editing.book}
        isNew={editing.isNew}
        onDone={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Books</h1>
        <Button onClick={() => setEditing({ book: structuredClone(emptyBook), isNew: true })}>+ Add book</Button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {!books ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-3">
          {books.map((b) => (
            <Card key={b.id} className={`flex flex-wrap items-center gap-4 p-4 ${b.is_active ? "" : "opacity-60"}`}>
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
                {b.cover && <img src={b.cover} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-48 flex-1">
                <p className="font-medium">
                  {b.title}{" "}
                  {!b.is_active && <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-xs">Hidden</span>}
                  {b.is_active && b.featured && (
                    <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">Home page</span>
                  )}
                </p>
                <p className="text-sm text-slate-500">{b.subtitle}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {categories.find((c) => c.id === b.category)?.label} · {b.language}
                </p>
              </div>
              <span className="w-20 text-right font-semibold">{inr(b.price)}</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditing({ book: structuredClone(b), isNew: false })}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => toggleActive(b)}>
                  {b.is_active ? "Hide" : "Show"}
                </Button>
                <Button variant="danger" onClick={() => remove(b)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
          {books.length === 0 && <p className="text-slate-500">No books yet. Click “Add book”.</p>}
        </div>
      )}
    </div>
  );
}

function BookForm({ initial, isNew, onDone }: { initial: BookRow; isNew: boolean; onDone: () => void }) {
  const [book, setBook] = useState<BookRow>(initial);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [aboutText, setAboutText] = useState((initial.about ?? []).join("\n\n"));
  const [highlightsText, setHighlightsText] = useState((initial.highlights ?? []).join("\n"));
  // Existing image URLs and newly picked files, in display order. Files upload on save.
  const [previews, setPreviews] = useState<(string | File)[]>(initial.preview_images ?? []);
  const movePreview = (i: number, step: number) =>
    setPreviews((list) => {
      const j = i + step;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const set = <K extends keyof BookRow>(key: K, value: BookRow[K]) => setBook((b) => ({ ...b, [key]: value }));
  const setPage = (i: number, j: 0 | 1, value: string) =>
    setBook((b) => ({ ...b, pages: b.pages.map((p, k) => (k === i ? (j === 0 ? [value, p[1]] : [p[0], value]) : p)) }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const db = supabase!;
    const id = isNew ? slugify(book.id || book.title) : book.id;
    if (!id) return setError("Please enter a title.");

    try {
      let cover = book.cover;
      if (coverFile) {
        setSaving("Uploading cover…");
        const path = `${id}/cover-${Date.now()}.${fileExt(coverFile)}`;
        const { error } = await db.storage.from("covers").upload(path, coverFile, { upsert: true });
        if (error) throw error;
        cover = db.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      const pdf_path = book.pdf_path;

      const preview_images: string[] = [];
      for (const [i, item] of previews.entries()) {
        if (typeof item === "string") {
          preview_images.push(item);
          continue;
        }
        setSaving(`Uploading preview image ${i + 1} of ${previews.length}…`);
        const path = `${id}/preview-${Date.now()}-${i}.${fileExt(item)}`;
        const { error } = await db.storage.from("covers").upload(path, item, { upsert: true });
        if (error) throw error;
        preview_images.push(db.storage.from("covers").getPublicUrl(path).data.publicUrl);
      }

      setSaving("Saving…");
      const pages = book.pages.filter(([h, t]) => h.trim() || t.trim());
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { created_at, updated_at, ...rest } = book;
      const about = aboutText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const highlights = highlightsText.split("\n").map((l) => l.trim()).filter(Boolean);
      const row = {
        ...rest,
        id,
        cover,
        pdf_path,
        pages,
        preview_images,
        about,
        highlights,
        price: Math.round(Number(book.price)),
      };

      const { error } = isNew
        ? await db.from("books").insert(row)
        : await db.from("books").update(row).eq("id", id);
      if (error) {
        throw error.code === "23505" ? new Error("A book with this ID already exists. Change the ID.") : error;
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving("");
    }
  };

  const coverPreview = coverFile ? URL.createObjectURL(coverFile) : book.cover;

  return (
    <form className="grid gap-6" onSubmit={save}>
      <div className="flex items-center gap-3">
        <button type="button" className="text-sm text-slate-500 hover:text-slate-900" onClick={onDone}>
          ← Back
        </button>
        <h1 className="mr-auto text-2xl font-semibold">{isNew ? "Add book" : `Edit “${initial.title}”`}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="grid gap-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Label text="Title">
              <Input value={book.title} onChange={(e) => set("title", e.target.value)} required />
            </Label>
            <Label text="ID (URL slug)" hint={isNew ? "auto from title" : "can't change"}>
              <Input
                value={isNew ? book.id || slugify(book.title) : book.id}
                onChange={(e) => set("id", slugify(e.target.value))}
                disabled={!isNew}
              />
            </Label>
          </div>
          <Label text="Subtitle" hint="shown under the title on the book card">
            <Input value={book.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Label text="Price (₹)">
              <Input type="number" min={0} value={book.price} onChange={(e) => set("price", Number(e.target.value))} required />
            </Label>
            <Label text="Category">
              <Select value={book.category} onChange={(e) => set("category", e.target.value as Category)}>
                {categories.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Label>
            <Label text="Display order" hint="lower = first">
              <Input type="number" value={book.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
            </Label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Label text="Language">
              <Select value={book.language} onChange={(e) => set("language", e.target.value as Language)}>
                {languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </Label>
            <Label text="Author">
              <Input value={book.author} onChange={(e) => set("author", e.target.value)} />
            </Label>
            <Label text="Eyebrow" hint="small caps label">
              <Input value={book.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="MINDFULNESS · FAMILY EDITION" />
            </Label>
          </div>
          <Label text="Description">
            <Textarea value={book.description} onChange={(e) => set("description", e.target.value)} />
          </Label>
          <Label text="About this book" hint="shown under “Read more” · leave a blank line between paragraphs">
            <Textarea rows={8} value={aboutText} onChange={(e) => setAboutText(e.target.value)} />
          </Label>
          <Label text="Inside the book" hint="one point per line, e.g. 64 colourful thick pages">
            <Textarea rows={4} value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} />
          </Label>
          <Label text="Quote">
            <Textarea rows={2} value={book.quote} onChange={(e) => set("quote", e.target.value)} />
          </Label>

          <div className="grid gap-3">
            <p className="text-sm font-medium text-slate-700">
              Preview images{" "}
              <span className="font-normal text-slate-400">
                · shown two per spread in the flip-book reader, in this order
              </span>
            </p>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {previews.map((item, i) => (
                  <div key={i} className="grid gap-1.5">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={typeof item === "string" ? item : URL.createObjectURL(item)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium">{i + 1}</span>
                    </div>
                    <div className="flex justify-center gap-1 text-xs">
                      <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => movePreview(i, -1)} aria-label="Move earlier">←</button>
                      <button type="button" className="rounded px-1.5 py-0.5 text-red-600 hover:bg-red-50" onClick={() => setPreviews((l) => l.filter((_, k) => k !== i))} aria-label="Remove image">✕</button>
                      <button type="button" className="rounded px-1.5 py-0.5 hover:bg-slate-100 disabled:opacity-30" disabled={i === previews.length - 1} onClick={() => movePreview(i, 1)} aria-label="Move later">→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-sm"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPreviews((l) => [...l, ...files]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-medium text-slate-700">
              Text preview pages{" "}
              <span className="font-normal text-slate-400">
                · {previews.length ? "not shown while preview images are set" : "shown in the flip-book reader"}
              </span>
            </p>
            {book.pages.map(([heading, text], i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3">
                <div className="flex gap-2">
                  <Input placeholder={`Page ${i + 1} heading`} value={heading} onChange={(e) => setPage(i, 0, e.target.value)} />
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => set("pages", book.pages.filter((_, k) => k !== i))}
                    aria-label="Remove page"
                  >
                    ✕
                  </Button>
                </div>
                <Textarea rows={2} placeholder="Page text" value={text} onChange={(e) => setPage(i, 1, e.target.value)} />
              </div>
            ))}
            <Button type="button" variant="ghost" className="justify-self-start" onClick={() => set("pages", [...book.pages, ["", ""]])}>
              + Add page
            </Button>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card className="grid gap-3 p-5">
            <p className="text-sm font-medium text-slate-700">Cover image</p>
            <div className="aspect-[2/3] overflow-hidden rounded-lg bg-slate-100">
              {coverPreview && <img src={coverPreview} alt="" className="h-full w-full object-cover" />}
            </div>
            <input type="file" accept="image/*" className="text-sm" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </Card>

          <Card className="grid gap-3 p-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={book.is_active} onChange={(e) => set("is_active", e.target.checked)} />
              Visible on website <span className="text-slate-400">(Bookshelf page)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={book.featured}
                disabled={!book.is_active}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Also show on home page
            </label>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={Boolean(saving)}>
            {saving || (isNew ? "Create book" : "Save changes")}
          </Button>
        </div>
      </div>
    </form>
  );
}
