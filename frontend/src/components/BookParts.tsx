import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Checkout from "./Checkout";
import type { Book } from "../data/books";

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4 14 14 4M6 4h8v8" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16M4 16h16" />
    </svg>
  );
}

export function Cover({ book, compact = false }: { book: Book; compact?: boolean }) {
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

export function BookReader({
  book,
  onClose,
  onAddToBag,
}: {
  book: Book;
  onClose: () => void;
  onAddToBag?: (book: Book) => void;
}) {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<"open" | "next" | "prev">("open");
  const [hasOpened, setHasOpened] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  // Image previews show two images per spread; text previews show one text page per spread.
  const images = book.previewImages ?? [];
  const hasImages = images.length > 0;
  // Books without preview images get one "preview coming soon" spread.
  const spreadCount = hasImages ? Math.ceil(images.length / 2) : 1;

  // Shape the pages like the preview images (width / height), so they fill each page edge to edge.
  const [pageRatio, setPageRatio] = useState(0.72);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Keep every word of the title whole: if the longest word is wider than the column
  // (e.g. "Moneytuition" on a narrow screen), shrink the font until it fits.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const base = parseFloat(getComputedStyle(el).fontSize);
      if (el.scrollWidth > el.clientWidth) {
        el.style.fontSize = `${Math.max(24, Math.floor((base * el.clientWidth) / el.scrollWidth) - 1)}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [book.title]);
  useEffect(() => {
    if (!images[0]) return;
    const probe = new Image();
    probe.onload = () => probe.naturalHeight && setPageRatio(probe.naturalWidth / probe.naturalHeight);
    probe.src = images[0];
  }, [images[0]]);

  const turn = (step: number) => {
    const next = Math.max(0, Math.min(spreadCount, position + step));
    if (next === position) return;
    setDirection(position === 0 && step > 0 ? "open" : step > 0 ? "next" : "prev");
    if (next > 0) setHasOpened(true);
    setPosition(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Don't turn pages while the customer is typing in the checkout form.
      if (event.target instanceof HTMLInputElement) return;
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
          className={`reader-visual ${isCover ? "reader-mode-cover" : "reader-mode-pages"} ${hasOpened ? "has-read" : ""
            } ${hasImages ? "has-image-pages" : ""}`}
          style={hasImages ? ({ "--page-ratio": pageRatio } as CSSProperties) : undefined}
        >
          <div className="reader-glow" />
          <div className="book-scene">
            <div className="open-book">
              <div className="book-board book-board-left" />
              <div className="book-board book-board-right" />
              <button
                className={`paper-page left-paper ${hasImages ? "has-image" : ""}`}
                onClick={() => turn(-1)}
                aria-label={position === 1 ? "Close the book cover" : "Turn to the previous page"}
              >
                {hasImages ? (
                  <img className="page-image" src={images[page * 2]} alt={`${book.title} – preview page ${page * 2 + 1}`} />
                ) : (
                  <>
                    <span className="page-label">{book.title}</span>
                    <h3>Preview coming soon</h3>
                    <p>We're preparing a few sample pages from this book. Check back soon to take a peek inside.</p>
                    <span className="page-prompt page-prompt-left">Tap to close cover</span>
                  </>
                )}
              </button>
              <button
                className={`paper-page right-paper ${hasImages && images[page * 2 + 1] ? "has-image" : ""}`}
                onClick={() => turn(1)}
                disabled={position === spreadCount}
                aria-label="Turn to the next page"
              >
                {hasImages && images[page * 2 + 1] ? (
                  <img className="page-image" src={images[page * 2 + 1]} alt={`${book.title} – preview page ${page * 2 + 2}`} />
                ) : hasImages ? (
                  <>
                    <span className="page-label">End of preview</span>
                    <p className="drop-cap">Enjoy the full book—order your copy to read every practice.</p>
                  </>
                ) : (
                  <>
                    <span className="page-label">In the meantime</span>
                    <p className="drop-cap">
                      Order your printed copy today and we'll deliver it to your doorstep.
                    </p>
                  </>
                )}
              </button>
              {!isCover && direction !== "open" && (
                <div
                  key={`${position}-${direction}`}
                  className={`turning-page turning-${direction}`}
                >
                  <div className="page-face page-front">

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
            <span>{isCover ? "Cover" : `${position} / ${spreadCount}`}</span>
            <button
              onClick={() => turn(1)}
              aria-label={isCover ? "Open book" : "Next page"}
              disabled={position === spreadCount}
            >
              →
            </button>
          </div>
        </div>

        <div className="reader-details">
          <span className="eyebrow">{book.eyebrow}</span>
          <h2 id="reader-title" ref={titleRef}>{book.title}</h2>
          <p className="reader-description">{book.description}</p>
          {Boolean(book.about?.length || book.highlights?.length) && (
            <details className="reader-more" key={book.id}>
              <summary>
                <span className="more-closed">Read more about this book</span>
                <span className="more-open">Show less</span>
              </summary>
              {book.about?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {book.highlights?.length ? (
                <>
                  <h3>{book.language === "Hindi" ? "पुस्तक में" : "Inside the book"}</h3>
                  <ul>
                    {book.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </details>
          )}
          <blockquote>{book.quote}</blockquote>
          <div className="reader-meta">
            <span>Printed book · Home delivery</span>
            <strong>₹{book.price}</strong>
          </div>
          {checkingOut ? (
            <Checkout book={book} onCancel={() => setCheckingOut(false)} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {onAddToBag && (
                <button
                  type="button"
                  className="primary-button wide-button"
                  onClick={() => {
                    onAddToBag(book);
                    setIsAdded(true);
                    setTimeout(() => setIsAdded(false), 2000);
                  }}
                >
                  {isAdded ? "Added to bag ✓" : "Add to bag"} <ArrowIcon />
                </button>
              )}
              <button
                type="button"
                className={onAddToBag ? "link-button" : "primary-button wide-button"}
                style={onAddToBag ? { justifySelf: "center", margin: "4px auto 0" } : undefined}
                onClick={() => setCheckingOut(true)}
              >
                Buy book <ArrowIcon />
              </button>
            </div>
          )}
          <p className="reader-note">Delivered to your doorstep across India</p>
        </div>
      </div>
    </div>
  );
}
