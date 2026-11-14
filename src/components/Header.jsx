"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";

const ROOT_EMAIL = "arhamwaresi6@gmail.com";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, client } = useAuth();
  const { count } = useCart();

  useEffect(() => {
    let active = true;
    if (!user || !client) {
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }

    if (user.email?.trim().toLowerCase() === ROOT_EMAIL) {
      setIsAdmin(true);
      return () => {
        active = false;
      };
    }

    client.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("Could not read the account role.", error);
        setIsAdmin(data?.role === "admin");
      })
      .catch((error) => {
        if (active) console.error("Could not read the account role.", error);
      });

    return () => {
      active = false;
    };
  }, [client, user]);

  return (
    <header className="site-header site-header-on-light">
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
        {isAdmin && (
          <Link className="nav-account" href="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </Link>
        )}
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
