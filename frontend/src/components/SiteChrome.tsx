import { useState } from "react";
import { MenuIcon } from "./BookParts";
import { categories } from "../data/books";
import { useAccount } from "../lib/account";
import { useBackToClose } from "../lib/backToClose";

/** On the home page links are in-page anchors; elsewhere they point back to "/". */
const link = (onHome: boolean, hash: string) => (onHome ? hash : `/${hash}`);

export const SITE_NAME = "Sw. Nirav Jayant";
export const SITE_TAGLINE = "A Buddha with wine in the marketplace…";

/**
 * Contact details shown in the footer. Fill these in — any left empty are simply not shown.
 * phone/whatsapp: digits with country code, e.g. "919876543210".
 */
const contact = {
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "", // full profile URL
  youtube: "", // full channel URL
};

export function SiteHeader({
  onHome,
  bagCount = 0,
  onOpenBag,
}: {
  onHome: boolean;
  bagCount?: number;
  onOpenBag?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeForNavigation = useBackToClose(menuOpen, () => setMenuOpen(false));
  // Menu links navigate away, so the menu closes without stepping back in history.
  const close = () => {
    closeForNavigation();
    setMenuOpen(false);
  };
  const account = useAccount();

  return (
    <header className="site-header">
      <a className="brand brand-lockup" href={link(onHome, "#top")} aria-label={`${SITE_NAME} – home`}>
        <span className="brand-name">{SITE_NAME}</span>
        <span className="brand-tagline">{SITE_TAGLINE}</span>
      </a>
      <nav className={menuOpen ? "nav-open" : ""} aria-label="Main navigation">
        <a
          href="/bookshelf"
          onClick={close}
          aria-current={window.location.pathname.startsWith("/bookshelf") ? "page" : undefined}
        >
          Bookshelf
        </a>
        <a href={link(onHome, "#about")} onClick={close}>
          About Nirav
        </a>
        <a href={link(onHome, "#practices")} onClick={close}>
          Shelves
        </a>
      </nav>
      <div className="header-actions">
        <a
          className="text-button account-link"
          href="/account"
          title={account ? account.email : undefined}
          aria-current={window.location.pathname.startsWith("/account") ? "page" : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8" />
            <path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
          </svg>
          <span>{account ? "My account" : "Sign in"}</span>
        </a>
        <button className="text-button" onClick={onOpenBag}>
          Bag ({bagCount})
        </button>
        <button className="menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
          <MenuIcon />
        </button>
      </div>
    </header>
  );
}

export function SiteFooter({ onHome }: { onHome: boolean }) {
  const year = new Date().getFullYear();
  const contactLinks = [
    contact.email && { label: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { label: `+${contact.phone}`, href: `tel:+${contact.phone}` },
    contact.whatsapp && { label: "WhatsApp", href: `https://wa.me/${contact.whatsapp}` },
    contact.instagram && { label: "Instagram", href: contact.instagram },
    contact.youtube && { label: "YouTube", href: contact.youtube },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-about">
          <a className="footer-brand" href={link(onHome, "#top")}>
            <span className="brand-name">{SITE_NAME}</span>
            <span className="brand-tagline">{SITE_TAGLINE}</span>
          </a>
          <p>Books for coming back to yourself.</p>
        </div>

        <nav className="footer-col" aria-label="Explore">
          <h4>Explore</h4>
          <a href={link(onHome, "#top")}>Home</a>
          <a href="/bookshelf">All books</a>
          <a href={link(onHome, "#about")}>About Nirav</a>
          <a href={link(onHome, "#practices")}>Shelves</a>
        </nav>

        <nav className="footer-col" aria-label="Shop by shelf">
          <h4>Shop by shelf</h4>
          {categories
            .filter((c) => c.id !== "all")
            .map((c) => (
              <a key={c.id} href={`/bookshelf?category=${c.id}`}>
                {c.label}
              </a>
            ))}
        </nav>

        <div className="footer-col">
          <h4>Orders</h4>
          <span>Printed books, delivered across India</span>
          <span>Secure payments by Razorpay</span>
          <span>UPI · Cards · Net banking</span>
        </div>

        {contactLinks.length > 0 && (
          <div className="footer-col">
            <h4>Get in touch</h4>
            {contactLinks.map((c) => (
              <a key={c.href} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {c.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="footer-bottom">
        <small>
          All rights reserved.
        </small>
        <small></small>
      </div>
    </footer>
  );
}
