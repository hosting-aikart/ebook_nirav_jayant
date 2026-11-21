import { useEffect, useMemo, useState } from "react";
import { ArrowIcon, BookReader, Cover } from "../components/BookParts";
import { BagLayer } from "../components/BagLayer";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { categories, languages, type Book, type Category, type Language } from "../data/books";
import { useBag } from "../lib/bag";
import { fetchBooks } from "../lib/books";

type CategoryFilter = "all" | Category;
type LanguageFilter = "all" | Language;

function readCategory(): CategoryFilter {
  const value = new URLSearchParams(window.location.search).get("category");
  return categories.some((c) => c.id === value) ? (value as CategoryFilter) : "all";
}

export default function Bookshelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [category, setCategory] = useState<CategoryFilter>(readCategory);
  const [language, setLanguage] = useState<LanguageFilter>("all");
  const [query, setQuery] = useState("");
  const bag = useBag(books);

  useEffect(() => {
    document.title = "Bookshelf · Sw. Nirav Jayant";
    fetchBooks().then((list) => {
      setBooks(list);
      setLoading(false);
    });
  }, []);

  // Keep ?category= in the URL so filtered views can be shared and linked to.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    window.history.replaceState(null, "", url);
  }, [category]);

  // Only lock while the reader is open, so closing it never unlocks scrolling
  // under a modal that opens at the same moment (e.g. the order confirmation).
  useEffect(() => {
    if (!selectedBook) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedBook]);

  // Books matching search + language, before the category filter (used for tab counts).
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter(
      (b) =>
        (language === "all" || b.language === language) &&
        (!q || [b.title, b.subtitle, b.description, b.author].some((v) => v.toLowerCase().includes(q))),
    );
  }, [books, language, query]);

  const visible = useMemo(
    () => (category === "all" ? searched : searched.filter((b) => b.category === category)),
    [searched, category],
  );

  const availableLanguages = languages.filter((lang) => books.some((b) => b.language === lang));
  const hasFilters = category !== "all" || language !== "all" || query.trim() !== "";
  const reset = () => {
    setCategory("all");
    setLanguage("all");
    setQuery("");
  };

  return (
    <div className="site-shell">
      <SiteHeader onHome={false} bagCount={bag.count} onOpenBag={bag.open} />

      <main className="books-section bookshelf-page">
        <label className="shelf-search">
          <span className="sr-only">Search books</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            placeholder="Search books by title or topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <div className="section-heading">
          <div>
            <span className="eyebrow">THE BOOKSHELF</span>
            <h1 className="bookshelf-title">
              Every book,
              <br />
              <em>in one place.</em>
            </h1>
          </div>
          <p className="bookshelf-intro">
            Playful practices for little ones, body-wise meditations for grown-ups, and gentle wisdom for
            opening to abundance. Find the one that finds you.
          </p>
        </div>

        <div className="shelf-filters">
          <div className="category-tabs" role="tablist" aria-label="Book categories">
            {categories.map((c) => {
              const count = c.id === "all" ? searched.length : searched.filter((b) => b.category === c.id).length;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={category === c.id}
                  className={`category-tab ${category === c.id ? "is-active" : ""}`}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                  <span className="category-count">{count}</span>
                </button>
              );
            })}
          </div>

          {availableLanguages.length > 1 && (
            <div className="shelf-pills" role="group" aria-label="Language">
              {(["all", ...availableLanguages] as LanguageFilter[]).map((lang) => (
                <button
                  key={lang}
                  className={`shelf-pill ${language === lang ? "is-active" : ""}`}
                  aria-pressed={language === lang}
                  onClick={() => setLanguage(lang)}
                >
                  {lang === "all" ? "All languages" : lang}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="shelf-result-count" aria-live="polite">
          {loading ? "Loading books…" : `${visible.length} ${visible.length === 1 ? "book" : "books"}`}
          {hasFilters && !loading && (
            <button className="shelf-clear" onClick={reset}>
              Clear filters
            </button>
          )}
        </p>

        {!loading && visible.length === 0 ? (
          <div className="shelf-empty">
            <p>No books match these filters.</p>
            <button className="primary-button" onClick={reset}>
              Show all books <ArrowIcon />
            </button>
          </div>
        ) : (
          <div className="book-grid" key={`${category}-${language}`}>
            {visible.map((book, index) => (
              <article className="book-card" key={book.id}>
                <button
                  className="card-cover-button"
                  onClick={() => setSelectedBook(book)}
                  aria-label={`Open ${book.title}`}
                >
                  <span className="book-index">{String(index + 1).padStart(2, "0")}</span>
                  {book.language !== "English" && <span className="book-language">{book.language}</span>}
                  <Cover book={book} />
                  <span className="open-pill">
                    Tap to open <ArrowIcon />
                  </span>
                </button>
                <div className="book-card-info">
                  <div>
                    <h3>{book.title}</h3>
                    <p>{book.subtitle}</p>
                  </div>
                  <div className="book-card-buy">
                    <strong>₹{book.price}</strong>
                    <button
                      type="button"
                      className="card-add-btn"
                      onClick={() => bag.add(book)}
                      aria-label={`Add ${book.title} to bag`}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <SiteFooter onHome={false} />

      {selectedBook && (
        <BookReader
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onAddToBag={bag.add}
          onOrderComplete={(receipt) => {
            setSelectedBook(null);
            bag.showReceipt(receipt);
          }}
        />
      )}

      <BagLayer bag={bag} onBrowseBooks={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </div>
  );
}
