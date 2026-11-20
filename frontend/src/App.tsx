import { useEffect, useState } from "react";
import { ArrowIcon, BookReader, Cover } from "./components/BookParts";
import { SiteFooter, SiteHeader } from "./components/SiteChrome";
import { BagDrawer } from "./components/BagDrawer";
import { OrderSuccessModal } from "./components/OrderSuccessModal";
import { categories, fallbackBooks, type Book, type Category } from "./data/books";
import { fetchBooks } from "./lib/books";
import { supabase } from "./lib/supabase";
import type { CartItem, OrderConfirmation } from "./types";

// Set to an image path (e.g. "/assets/about/nirav-jayant.jpg") once the photo is ready.
const ABOUT_PHOTO: string | null = "/assets/nirav-sir.png";

type Shelf = {
  id: Category;
  eyebrow: string;
  title: string;
  highlights: [string, string][];
  quote: string;
  cta: string;
  covers: { src: string; alt: string }[];
};

const shelves: Shelf[] = [
  {
    id: "kids",
    eyebrow: "BOOKS FOR KIDS",
    title: "Where play becomes peace",
    highlights: [
      ["59", "playful meditations"],
      ["64", "breathing games"],
      ["48", "super-sense games"],
    ],
    quote: "Meditation should not begin as discipline. It should begin as delight.",
    cta: "Explore books for kids",
    covers: [
      { src: "/books/playing-with-breath.jpg", alt: "Playing with Breath book cover" },
      { src: "/books/playing-with-meditation.png", alt: "Playing with Meditation book cover" },
    ],
  },
  {
    id: "meditation",
    eyebrow: "BOOKS FOR MEDITATION",
    title: "Release, relax, return",
    highlights: [
      ["59", "somatic practices"],
      ["5–10", "minute body resets"],
      ["365", "daily meditations"],
    ],
    quote: "Anger becomes energy, anxiety becomes awareness, and your body becomes your healer.",
    cta: "Explore meditation books",
    covers: [
      { src: "/books/unwinding-anxiety.jpg", alt: "Unwinding Anxiety book cover" },
      { src: "/books/zenful-stories.png", alt: "Zenful Stories book cover" },
      { src: "/books/release-and-relax.png", alt: "Release and Relax book cover" },
    ],
  },
  {
    id: "abundance",
    eyebrow: "BOOKS FOR MONEY & ABUNDANCE",
    title: "Open to possibility",
    highlights: [
      ["Open", "hands, open heart"],
      ["Trust", "the unknown"],
      ["Grow", "into possibility"],
    ],
    quote: "When you stop insisting on how, life begins to show you somehow.",
    cta: "Explore abundance books",
    covers: [{ src: "/books/somehow.jpg", alt: "Somehow book cover" }],
  },
];

export default function App() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | Category>("all");
  // With Supabase configured, start empty so removed books never flash on screen.
  const [allBooks, setAllBooks] = useState<Book[]>(supabase ? [] : fallbackBooks);

  useEffect(() => {
    fetchBooks().then(setAllBooks);
  }, []);

  // The home page shows only books marked "Show on home page"; every book is on /bookshelf.
  const books = allBooks.filter((book) => book.featured);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("still_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<OrderConfirmation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("still_cart", JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  const addToBag = (book: Book) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.book.id === book.id);
      if (exists) {
        return prev.map((item) =>
          item.book.id === book.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
    setToastMessage(`"${book.title}" added to your bag`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromBag(bookId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.book.id === bookId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromBag = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const visibleBooks =
    activeCategory === "all" ? books : books.filter((book) => book.category === activeCategory);

  useEffect(() => {
    document.body.style.overflow = selectedBook ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedBook]);

  const scrollToBooks = () =>
    document.querySelector("#books")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="site-shell">
      <SiteHeader onHome bagCount={totalCartCount} onOpenBag={() => setIsBagOpen(true)} />

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <span className="eyebrow">A LITTLE STILLNESS. A DEEPER CONNECTION.</span>
            <h1>
              Come home
              <br />
              to yourself.
            </h1>
            <p>
              Books to quiet the mind, listen to the body, and rediscover the beauty of simply
              being.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={scrollToBooks}>
                Explore the books <ArrowIcon />
              </button>
              <a className="link-button" href="#about">
                Meet Nirav <ArrowIcon />
              </a>
            </div>
            <div className="hero-footnote">
              <span />
              Rooted in meditation. Written for everyday life.
            </div>
          </div>

          <div className="hero-books" aria-label="Featured books">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            {books[1] && (
              <button className="hero-book hero-back" onClick={() => setSelectedBook(books[1])}>
                <Cover book={books[1]} />
              </button>
            )}
            {books[0] && (
              <button className="hero-book hero-front" onClick={() => setSelectedBook(books[0])}>
                <Cover book={books[0]} />
              </button>
            )}
            <span className="hero-hint">Tap a cover to open</span>
          </div>
        </section>

        <section className="promise-strip" aria-label="Store benefits">
          <span>Thoughtfully written</span>
          <i />
          <span>Delivered with care</span>
          <i />
          <span>Made for real life</span>
        </section>

        <section className="books-section" id="books">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE BOOKSHELF</span>
              <h2>
                A few pages.
                <br />A new perspective.
              </h2>
            </div>
          </div>

          <div className="category-tabs" role="tablist" aria-label="Book categories">
            {categories.map((category) => {
              const count =
                category.id === "all"
                  ? books.length
                  : books.filter((book) => book.category === category.id).length;
              return (
                <button
                  key={category.id}
                  role="tab"
                  aria-selected={activeCategory === category.id}
                  className={`category-tab ${activeCategory === category.id ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                  <span className="category-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="book-grid" key={activeCategory}>
            {visibleBooks.map((book, index) => (
              <article className="book-card" key={book.id}>
                <button
                  className="card-cover-button"
                  onClick={() => setSelectedBook(book)}
                  aria-label={`Open ${book.title}`}
                >
                  <span className="book-index">0{index + 1}</span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        addToBag(book);
                      }}
                      aria-label={`Add ${book.title} to bag`}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <a className="bookshelf-link" href="/bookshelf">
            Browse the full bookshelf
            <small>{allBooks.length} books</small>
            <ArrowIcon />
          </a>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          {/* Part 1 — portrait + headline with retro stripes */}
          <div className="about-intro">
            <svg
              className="about-stripes"
              viewBox="0 0 1440 360"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {[
                ["#d9c48f", 0],
                ["#f4a49c", 26],
                ["#fc817c", 52],
                ["#123f48", 78],
              ].map(([color, o]) => (
                <path
                  key={color}
                  d={`M0 ${250 + Number(o)} H${780 + Number(o)} C${900 + Number(o)} ${250 + Number(o)} ${900 + Number(o)} ${130 + Number(o)} ${1020 + Number(o)} ${130 + Number(o)} H1440`}
                  stroke={color as string}
                />
              ))}
            </svg>

            <div className="about-portrait">
              <svg className="about-sparkles" viewBox="0 0 120 140" aria-hidden="true">
                <path d="M40 20 Q44 52 72 56 Q44 60 40 92 Q36 60 8 56 Q36 52 40 20Z" />
                <path d="M88 0 Q90 16 104 18 Q90 20 88 36 Q86 20 72 18 Q86 16 88 0Z" />
                <path d="M78 74 Q80 88 92 90 Q80 92 78 106 Q76 92 64 90 Q76 88 78 74Z" />
                <circle cx="14" cy="14" r="4" />
              </svg>
              <svg className="about-sparkles about-sparkles-low" viewBox="0 0 80 100" aria-hidden="true">
                <path d="M34 20 Q37 48 62 52 Q37 56 34 84 Q31 56 6 52 Q31 48 34 20Z" />
                <circle cx="66" cy="12" r="4" />
              </svg>
              <div className="about-blob" aria-hidden="true" />
              <div className="about-photo-frame">
                {ABOUT_PHOTO ? (
                  <img src={ABOUT_PHOTO} alt="Dr. Sw. Nirav Jayant" />
                ) : (
                  <div className="about-photo-placeholder">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    <span>Photo coming soon</span>
                  </div>
                )}
              </div>
            </div>

            <div className="about-headline">
              <span className="eyebrow">MEET NIRAV</span>
              <h2 id="about-title">
                Osho Meditation Facilitator,
                <br />
                <em>Author &amp; Guide</em> to
                <br />
                Joyful Inner Growth
              </h2>
              <p className="about-signature">— Dr. Sw. Nirav Jayant</p>
            </div>
          </div>

          {/* Part 2 — About card + decorative side */}
          <div className="about-story">
            <article className="about-card">
              <h3>About Me</h3>
              <p className="about-lead">
                An Osho Sannyasin since 1995, Dr. Sw. Nirav Jayant is an experienced Osho meditation
                facilitator with over 20 years of devoted practice and guidance.
              </p>
              <p>
                He has been leading Osho meditation camps, retreats, and online workshops, touching
                the hearts of many Osho lovers around the world. His joyful, lighthearted style
                creates an atmosphere of deep transformation through laughter, silence, and
                awareness.
              </p>
              <p>
                He is also the author of several books on meditation, inner growth, and conscious
                living, and has designed many online and offline workshops, including{" "}
                <em>Healing the Inner Child</em>, <em>Living with Intuition</em>, and{" "}
                <em>5 Steps to Freedom</em>.
              </p>
              <p>
                He brings his skills as a coach in Neuro-Linguistic Programming to his work and is
                also a Tai Chi teacher.
              </p>
            </article>

            <div className="about-side">
              <svg className="about-mandala" viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="92" />
                <circle cx="100" cy="100" r="74" strokeDasharray="2 6" />
                <circle cx="100" cy="100" r="40" />
                {Array.from({ length: 12 }, (_, i) => (
                  <ellipse
                    key={i}
                    cx="100"
                    cy="44"
                    rx="10"
                    ry="20"
                    transform={`rotate(${i * 30} 100 100)`}
                  />
                ))}
                <circle cx="100" cy="100" r="8" />
              </svg>
              <dl className="about-stats">
                <div>
                  <dt>1995</dt>
                  <dd>Sannyasin since</dd>
                </div>
                <div>
                  <dt>20+</dt>
                  <dd>Years devoted</dd>
                </div>
                <div>
                  <dt>NLP</dt>
                  <dd>Coach · Tai Chi teacher</dd>
                </div>
              </dl>
              <p className="about-motto">Laughter · Silence · Awareness</p>
            </div>
          </div>

          <svg className="about-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 60 C240 0 480 10 720 52 C960 94 1200 110 1440 40 V120 H0Z" />
          </svg>
        </section>

        <section className="shelves-section" id="practices" aria-labelledby="shelves-title">
          <header className="shelves-header">
            <span className="eyebrow">THREE SHELVES · ONE JOURNEY</span>
            <h2 id="shelves-title">
              Find the book
              <br />
              <em>that finds you.</em>
            </h2>
            <p>
              Playful practices for little ones, body-wise meditations for grown-ups, and gentle
              wisdom for opening to abundance.
            </p>
          </header>

          <div className="shelves-grid">
            {shelves.map((shelf, index) => {
              const count = allBooks.filter((book) => book.category === shelf.id).length;
              return (
                <article className={`shelf-card shelf-${shelf.id}`} key={shelf.id}>
                  <div className="shelf-copy">
                    <span className="shelf-eyebrow">
                      {String(index + 1).padStart(2, "0")} · {shelf.eyebrow}
                    </span>
                    <h3>{shelf.title}</h3>
                    <ul className="shelf-highlights">
                      {shelf.highlights.map(([value, label]) => (
                        <li key={label}>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="shelf-stage">
                    <span className="shelf-sun" aria-hidden="true" />
                    <div className={`shelf-covers covers-${shelf.covers.length}`}>
                      {shelf.covers.map((cover) => (
                        <img key={cover.src} src={cover.src} alt={cover.alt} loading="lazy" />
                      ))}
                    </div>
                  </div>

                  <div className="shelf-footer">
                    <blockquote>{shelf.quote}</blockquote>
                    <a
                      className="shelf-cta"
                      href={`/bookshelf?category=${shelf.id}`}
                    >
                      <span>
                        {shelf.cta}
                        <small>
                          {count} {count === 1 ? "book" : "books"}
                        </small>
                      </span>
                      <ArrowIcon />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter onHome />

      {selectedBook && (
        <BookReader
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onAddToBag={addToBag}
        />
      )}

      <BagDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromBag}
        onPaymentSuccess={(order) => {
          setOrderSuccess(order);
          setCart([]);
        }}
        onBrowseBooks={scrollToBooks}
      />

      {orderSuccess && (
        <OrderSuccessModal
          order={orderSuccess}
          onClose={() => setOrderSuccess(null)}
        />
      )}

      {toastMessage && (
        <div className="still-toast" role="status">
          <span>{toastMessage}</span>
          <button
            type="button"
            className="still-toast-btn"
            onClick={() => setIsBagOpen(true)}
          >
            View Bag
          </button>
        </div>
      )}
    </div>
  );
}
