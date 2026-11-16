import { useEffect, useState } from "react";

type Category = "kids" | "meditation" | "abundance";

type Book = {
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
};

const categories: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "kids", label: "Books for Kids" },
  { id: "meditation", label: "Books for Meditation" },
  { id: "abundance", label: "Books for Money & Abundance" },
];

const books: Book[] = [
  {
    id: "playing",
    title: "Playing with Meditation",
    eyebrow: "MINDFULNESS · FAMILY EDITION",
    author: "Sw. Nirav Jayant",
    price: 500,
    description:
      "59 playful meditations created for curious children of every age—and the grown-ups who want to slow down with them.",
    quote: "“Make a little room for wonder, and stillness arrives on its own.”",
    cover: "/books/playing-with-meditation.png",
    coverClass: "cover-playing",
    subtitle: "59 playful meditations for kids of all ages",
    category: "kids",
    pages: [
      [
        "A small pause",
        "Sit comfortably. Notice three sounds nearby, then three sounds far away. There is nothing to fix—only something new to hear.",
      ],
      [
        "The sun breath",
        "Stretch your arms out wide as you breathe in. Bring your hands to your heart as you breathe out. Repeat slowly, like sunrise.",
      ],
      [
        "A pocket of calm",
        "Imagine carrying a quiet garden in your pocket. What grows there? Visit it whenever the day feels too loud.",
      ],
    ],
  },
  {
    id: "zenful",
    title: "Zenful Stories",
    eyebrow: "WISDOM · DIGITAL EDITION",
    author: "Sw. Nirav Jayant",
    price: 599,
    description:
      "Everyday wisdom from ancient Zen masters. A thoughtful companion for building a quieter, more conscious everyday practice.",
    quote: "“A gentle invitation to pause, soften, and meet this moment exactly as it is.”",
    cover: "/books/zenful-stories.png",
    coverClass: "cover-zenful",
    subtitle: "Everyday wisdom from ancient Zen masters",
    category: "meditation",
    pages: [
      [
        "The empty cup",
        "A scholar came to learn about Zen. The master poured tea until the cup overflowed. “Like this cup,” he said, “you are full of ideas.”",
      ],
      [
        "Just this step",
        "The path is not waiting at the end of the journey. It is beneath your feet, whole and complete, in this single step.",
      ],
      [
        "The sound of rain",
        "When rain comes, listen without naming it. For one quiet minute, let the world arrive before your thoughts do.",
      ],
    ],
  },
  {
    id: "breath",
    title: "Playing with Breath",
    eyebrow: "BREATHWORK · FOR KIDS",
    author: "Sw. Nirav Jayant",
    price: 500,
    description:
      "64 fun breathing games for kids—simple, playful ways to calm big feelings, find focus, and enjoy the magic of a single breath.",
    quote: "“Every breath is a little game you can always play.”",
    cover: "/books/playing-with-breath.jpg",
    coverClass: "cover-breath",
    subtitle: "64 fun breathing games for kids",
    category: "kids",
    pages: [
      [
        "Dandelion wish",
        "Hold an imaginary dandelion. Breathe in slowly through your nose, then blow out gently and watch the seeds float away.",
      ],
      [
        "Balloon belly",
        "Place your hands on your tummy. Breathe in and let it grow round like a balloon. Breathe out and let it softly shrink.",
      ],
      [
        "Bumblebee hum",
        "Close your eyes and breathe in. As you breathe out, hum like a bee. Feel the tiny buzz in your face and chest.",
      ],
    ],
  },
  {
    id: "meditation-365",
    title: "Meditation 365",
    eyebrow: "DAILY PRACTICE · YEAR-ROUND",
    author: "Sw. Nirav Jayant",
    price: 699,
    description:
      "Simple, easy-to-do daily meditations designed to fit into your everyday life—one for every day of the year.",
    quote: "“A single quiet minute, repeated, becomes a different life.”",
    cover: "/books/meditation-365.jpg",
    coverClass: "cover-365",
    subtitle: "365 simple daily meditations for everyday life",
    category: "meditation",
    pages: [
      [
        "Day 1 · Arrive",
        "Sit where you are. Feel the weight of your body resting down. Let this moment be the whole of your practice today.",
      ],
      [
        "Day 2 · Count ten",
        "Count ten slow breaths. If you lose count, smile and begin again at one. Beginning again is the practice.",
      ],
      [
        "Day 3 · Morning light",
        "Before reaching for your phone, look toward the light for three breaths. Let the day find you first.",
      ],
    ],
  },
  {
    id: "zenful-21",
    title: "Zenful 21 Days",
    eyebrow: "ZEN · 21-DAY JOURNEY",
    author: "Sw. Nirav Jayant",
    price: 549,
    description:
      "Small Zen meditation techniques for your daily life—a gentle 21-day journey into stillness, presence, and ease.",
    quote: "“This very body the Buddha; this very earth the lotus paradise.”",
    cover: "/books/zenful-21-days.png",
    coverClass: "cover-zenful-21",
    subtitle: "Small Zen meditation techniques for daily life",
    category: "meditation",
    pages: [
      [
        "Day 1 · Just sitting",
        "Sit with nothing to achieve. When thoughts come, let them pass like clouds. You are the sky, not the weather.",
      ],
      [
        "Day 2 · Walking slowly",
        "Walk ten steps as slowly as you can. Feel the heel, the arch, the toes. Arrive fully with every step.",
      ],
      [
        "Day 3 · One thing",
        "Wash one cup with total attention. The warmth of water, the curve of the cup. This is meditation too.",
      ],
    ],
  },
  {
    id: "release-relax",
    title: "Release and Relax",
    eyebrow: "SOMATIC · EMOTIONAL RELEASE",
    author: "Sw. Nirav Jayant",
    price: 599,
    description:
      "30 simple yet powerful somatic ways to release anger—safely letting emotion move through the body so calm can return.",
    quote: "“What we allow to move, moves on.”",
    cover: "/books/release-and-relax.png",
    coverClass: "cover-release",
    subtitle: "30 somatic ways to release anger",
    category: "meditation",
    pages: [
      [
        "Shake it out",
        "Stand and shake your hands, then your arms, then your whole body for one minute. Let the energy leave through your fingertips.",
      ],
      [
        "The long exhale",
        "Breathe in for four counts, out for eight. A longer exhale tells the body it is safe to soften.",
      ],
      [
        "Press and release",
        "Press your palms together hard for five breaths. Then let go completely and notice the warmth that follows.",
      ],
    ],
  },
  {
    id: "unwinding-anxiety",
    title: "Unwinding Anxiety",
    eyebrow: "SOMATIC · NERVOUS SYSTEM",
    author: "Sw. Nirav Jayant",
    price: 599,
    description:
      "50 somatic ways to rewire your nervous system—gentle, body-based practices for easing anxiety and feeling safe again.",
    quote: "“Calm is not something you think. It is something the body remembers.”",
    cover: "/books/unwinding-anxiety.png",
    coverClass: "cover-anxiety",
    subtitle: "50 somatic ways to rewire your nervous system",
    category: "meditation",
    pages: [
      [
        "Hand on heart",
        "Place one hand on your heart and one on your belly. Feel the warmth. Breathe as if breathing into your hands.",
      ],
      [
        "Five things",
        "Name five things you can see, four you can touch, three you can hear. Let your senses bring you back.",
      ],
      [
        "Butterfly hug",
        "Cross your arms over your chest and tap your shoulders slowly, left then right. Let the rhythm settle you.",
      ],
    ],
  },
  {
    id: "somehow",
    title: "Somehow",
    eyebrow: "ABUNDANCE · POSSIBILITY",
    author: "Dr. Sw. Nirav Jayant",
    price: 649,
    description:
      "The art of living in the world of possibilities—opening to abundance, trusting the unknown, and finding a way, somehow.",
    quote: "“When you stop insisting on how, life begins to show you somehow.”",
    cover: "/books/somehow.jpg",
    coverClass: "cover-somehow",
    subtitle: "Art of living in the world of possibilities",
    category: "abundance",
    pages: [
      [
        "Open hands",
        "Notice where you are gripping—your jaw, your plans, your expectations. Open your hands and let something new arrive.",
      ],
      [
        "Already enough",
        "Write down three things you already have that you once wished for. Abundance begins with noticing.",
      ],
      [
        "The next small step",
        "You do not need to see the whole road. Ask only: what is one small step I can take today?",
      ],
    ],
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 14 14 4M6 4h8v8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}

function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
  return (
    <div className={`book-cover ${book.coverClass} ${compact ? "is-compact" : ""}`}>
      {book.cover ? (
        <img src={book.cover} alt={`${book.title} book cover`} />
      ) : (
        <div className="cover-art" aria-label={`${book.title} book cover`}>
          <span className="cover-kicker">A mindful companion</span>
          <strong>{book.title}</strong>
          <i />
          <small>{book.author}</small>
        </div>
      )}
    </div>
  );
}

function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<"open" | "next" | "prev">("open");
  const [hasOpened, setHasOpened] = useState(false);

  const turn = (step: number) => {
    const next = Math.max(0, Math.min(book.pages.length, position + step));
    if (next === position) return;
    setDirection(position === 0 && step > 0 ? "open" : step > 0 ? "next" : "prev");
    if (next > 0) setHasOpened(true);
    setPosition(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") turn(1);
      if (event.key === "ArrowLeft") turn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const page = Math.max(0, position - 1);
  const isCover = position === 0;

  return (
    <div className="reader-backdrop" role="dialog" aria-modal="true" aria-labelledby="reader-title">
      <div className="reader-panel">
        <button className="close-button" onClick={onClose} aria-label="Close book details">
          <span />
          <span />
        </button>

        <div
          className={`reader-visual ${isCover ? "reader-mode-cover" : "reader-mode-pages"} ${
            hasOpened ? "has-read" : ""
          }`}
        >
          <div className="reader-glow" />
          <div className="book-scene">
            <div className="open-book">
              <div className="book-board book-board-left" />
              <div className="book-board book-board-right" />
              <button
                className="paper-page left-paper"
                onClick={() => turn(-1)}
                aria-label={position === 1 ? "Close the book cover" : "Turn to the previous page"}
              >
                <span className="page-label">{book.title}</span>
                <h3>{book.pages[page][0]}</h3>
                <p>{book.pages[page][1]}</p>
                <span className="page-number">{page * 2 + 2}</span>
                <span className="page-prompt page-prompt-left">
                  {position === 1 ? "Tap to close cover" : "Tap to turn back"}
                </span>
              </button>
              <button
                className="paper-page right-paper"
                onClick={() => turn(1)}
                disabled={position === book.pages.length}
                aria-label="Turn to the next page"
              >
                <span className="page-label">A practice to try</span>
                <p className="drop-cap">
                  Close your eyes for a moment. Let the breath find its own rhythm and notice where
                  your attention chooses to rest.
                </p>
                <span className="page-prompt">Tap page to turn</span>
                <span className="page-number">{page * 2 + 3}</span>
              </button>
              {!isCover && direction !== "open" && (
                <div
                  key={`${position}-${direction}`}
                  className={`turning-page turning-${direction}`}
                >
                  <div className="page-face page-front">
                    <span>{book.pages[page][0]}</span>
                  </div>
                  <div className="page-face page-back" />
                </div>
              )}
              <div className="book-spine" />
              <button
                className="opening-cover"
                onClick={() => turn(1)}
                aria-label={`Open ${book.title}`}
                disabled={!isCover}
              >
                <Cover book={book} compact />
                <span className="cover-tap-hint">Tap cover to open</span>
              </button>
            </div>
          </div>
          <div className="page-controls">
            <button onClick={() => turn(-1)} aria-label="Previous page" disabled={isCover}>
              ←
            </button>
            <span>{isCover ? "Cover" : `${position} / ${book.pages.length}`}</span>
            <button
              onClick={() => turn(1)}
              aria-label={isCover ? "Open book" : "Next page"}
              disabled={position === book.pages.length}
            >
              →
            </button>
          </div>
        </div>

        <div className="reader-details">
          <span className="eyebrow">{book.eyebrow}</span>
          <h2 id="reader-title">{book.title}</h2>
          <p className="reader-description">{book.description}</p>
          <blockquote>{book.quote}</blockquote>
          <div className="reader-meta">
            <span>Instant access</span>
            <strong>₹{book.price}</strong>
          </div>
          <button className="primary-button wide-button">
            Add e-book to bag <ArrowIcon />
          </button>
          <p className="reader-note">PDF + EPUB · Read on any device</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"all" | Category>("all");

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
      <header className="site-header">
        <a className="brand brand-name" href="#top" aria-label="Sw. Nirav Jayant – home">
          Sw. Nirav Jayant
        </a>
        <nav className={menuOpen ? "nav-open" : ""} aria-label="Main navigation">
          <a href="#books" onClick={() => setMenuOpen(false)}>
            Books
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About Nirav
          </a>
          <a href="#journal" onClick={() => setMenuOpen(false)}>
            Journal
          </a>
        </nav>
        <div className="header-actions">
          <button className="text-button">Bag (0)</button>
          <button
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

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
            <button className="hero-book hero-back" onClick={() => setSelectedBook(books[1])}>
              <Cover book={books[1]} />
            </button>
            <button className="hero-book hero-front" onClick={() => setSelectedBook(books[0])}>
              <Cover book={books[0]} />
            </button>
            <span className="hero-hint">Tap a cover to open</span>
          </div>
        </section>

        <section className="promise-strip" aria-label="Store benefits">
          <span>Thoughtfully written</span>
          <i />
          <span>Instant digital access</span>
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
            <p>
              Gentle reads for wherever you are. Tap any cover and watch it open—then turn the pages
              without leaving this space.
            </p>
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
                  <strong>₹{book.price}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="practice-section" id="about" aria-label="Three ways to return">
          <article className="practice-card practice-quiet">
            <div className="practice-copy">
              <span>01 · MEDITATION</span>
              <h2>Quiet the mind</h2>
              <p>Create a little space between you and the noise of everyday life.</p>
            </div>
            <img
              src="/assets/meditation/quiet-mind.jpg"
              alt="A singing bowl and mallet arranged for meditation"
            />
          </article>
          <article className="practice-card practice-present">
            <div className="practice-copy">
              <span>02 · MINDFULNESS</span>
              <h2>Return to the present</h2>
              <p>Discover the extraordinary in the beautifully ordinary.</p>
            </div>
            <img
              src="/assets/meditation/present.jpg"
              alt="An open journal on a quiet wooden table"
            />
          </article>
          <article className="practice-card practice-body">
            <div className="practice-copy">
              <span>03 · EMOTIONAL RELEASE</span>
              <h2>Listen to your body</h2>
              <p>Make room to feel, soften, and let life move through you.</p>
            </div>
            <img
              src="/assets/meditation/listen-body.jpg"
              alt="A woman pausing with one hand over her heart"
            />
          </article>
        </section>

        <section className="journal-section" id="journal">
          <span className="eyebrow">A NOTE FOR YOUR DAY</span>
          <blockquote>
            “There is nowhere else to arrive. This breath, this room, this life is already asking to
            be noticed.”
          </blockquote>
          <div className="journal-rule">
            <span />
          </div>
          <p>From the Still Journal · Issue 08</p>
        </section>

        <section className="newsletter">
          <div>
            <span className="eyebrow">LETTERS FOR SLOWER DAYS</span>
            <h2>
              A quiet note,
              <br />
              now and then.
            </h2>
          </div>
          <form onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="email">Email address</label>
            <div className="email-field">
              <input id="email" type="email" placeholder="you@example.com" />
              <button aria-label="Subscribe">
                <ArrowIcon />
              </button>
            </div>
            <p>No noise. No rush. Unsubscribe whenever you like.</p>
          </form>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">S</span>
          <span>STILL.</span>
        </a>
        <p>Books for coming back to yourself.</p>
        <div>
          <a href="#books">Books</a>
          <a href="#about">About</a>
          <a href="#journal">Journal</a>
        </div>
        <small>© 2025 Still Studio</small>
      </footer>

      {selectedBook && <BookReader book={selectedBook} onClose={() => setSelectedBook(null)} />}
    </div>
  );
}
