"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { count } = useCart();

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Rongkushol home">
        rong<span>kushol</span>
      </Link>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <nav className={`main-nav${menuOpen ? " is-open" : ""}`}>
        <Link href="/shop" onClick={() => setMenuOpen(false)}>
          Shop
        </Link>
        <Link href="/#offers" onClick={() => setMenuOpen(false)}>
          Offers
        </Link>
        <Link href="/cart" onClick={() => setMenuOpen(false)}>
          Bag <span className="bag-count">{count}</span>
        </Link>
        {user ? (
          <Link className="nav-account" href="/profile" onClick={() => setMenuOpen(false)}>
            Account
          </Link>
        ) : (
          <Link className="nav-account" href="/login" onClick={() => setMenuOpen(false)}>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
