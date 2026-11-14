"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { getProductImageUrl } from "../lib/productImages";
import { useCart } from "./CartProvider";
import ProductCard from "./ProductCard";

const themes = [
  { name: "Velocity", color: "blue", image: getProductImageUrl("shoe-png.png") },
  { name: "Vortexx", color: "green", image: getProductImageUrl("shoe-png-green2.png") },
  { name: "Driftt", color: "neon", image: getProductImageUrl("shoe-png-neon.png") },
];

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function ProductGrid({ products, onAdd }) {
  if (!products.length) {
    return <p className="empty-note">Nothing here yet. Check back soon.</p>;
  }
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}

export default function Storefront({ catalogOnly = false }) {
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(themes[0]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const { addItem } = useCart();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("shoe-color");
    const saved = themes.find((item) => item.color === savedTheme);
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([apiRequest("/products"), catalogOnly ? Promise.resolve([]) : apiRequest("/offers")])
      .then(([productRows, offerRows]) => {
        if (!active) return;
        setProducts(productRows);
        setOffers(shuffled(offerRows));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [catalogOnly]);

  const visibleProducts = useMemo(() => {
    let results = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        `${product.name} ${product.brand} ${product.description}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
    if (sort === "price-asc") results = [...results].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") results = [...results].sort((a, b) => b.price - a.price);
    if (sort === "featured") {
      results = [...results].sort(
        (a, b) => Number(b.is_featured) - Number(a.is_featured),
      );
    }
    return results;
  }, [category, products, search, sort]);

  const featuredProducts = useMemo(() => {
    const highlighted = products.filter((product) => product.is_featured);
    return shuffled((highlighted.length ? highlighted : products).slice(0, 4));
  }, [products]);

  function chooseTheme(nextTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem("shoe-color", nextTheme.color);
  }

  if (catalogOnly) {
    return (
      <main className="page-shell shop-page">
        <section className="page-intro">
          <p className="eyebrow">THE EVERYDAY EDIT</p>
          <h1>Find your next favorite.</h1>
          <p>Good design, easy comfort, made to move with you.</p>
        </section>
        <section className="catalog-section" aria-label="Product catalog">
          <div className="catalog-toolbar">
            <label className="search-field">
              <span className="sr-only">Search products</span>
              <input
                type="search"
                placeholder="Search styles, brands..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="sort-field">
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="filter-row" aria-label="Filter by category">
            {["all", "shoes", "clothing", "bags"].map((item) => (
              <button
                key={item}
                className={`filter-chip${category === item ? " active" : ""}`}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item === "all" ? "Everything" : item}
              </button>
            ))}
          </div>
          {error ? (
            <ApiError message={error} onRetry={() => window.location.reload()} />
          ) : (
            <>
              <p className="results-count">{visibleProducts.length} pieces to explore</p>
              <ProductGrid products={visibleProducts} onAdd={addItem} />
            </>
          )}
        </section>
      </main>
    );
  }

  const heroProduct = featuredProducts[0] || products[0];

  return (
    <main>
      <section className={`hero hero-${theme.color}`}>
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">THE EVERYDAY EDIT / 2026</p>
            <h1>
              Move your
              <br />
              <span>own way.</span>
            </h1>
            <p className="hero-description">
              Everyday sneakers, layers and carry-alls with comfort built in—and a little extra character.
            </p>
            <Link className="button button-light" href="/shop">
              Shop the collection <span aria-hidden="true">↗</span>
            </Link>
            <div className="theme-picker" aria-label="Choose a shoe colorway">
              <span>CHOOSE YOUR COLOR</span>
              {themes.map((item) => (
                <button
                  key={item.color}
                  aria-label={`Show ${item.name} colorway`}
                  aria-pressed={theme.color === item.color}
                  className={`theme-dot theme-dot-${item.color}${theme.color === item.color ? " selected" : ""}`}
                  onClick={() => chooseTheme(item)}
                  type="button"
                />
              ))}
              <strong>{theme.name}</strong>
            </div>
          </div>
          <div className="hero-art" key={theme.color}>
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <div className="hero-glow" />
            <Image
              className="hero-shoe"
              src={theme.image}
              alt={`${theme.name} colorway shoe`}
              width={760}
              height={760}
              priority
            />
            <div className="hero-product-label">
              <span>YOUR NEW EVERYDAY</span>
              <strong>{theme.name}</strong>
            </div>
            <p className="hero-caption">COMFORT THAT KEEPS UP</p>
          </div>
        </div>
        <Link className="hero-scroll" href="/shop">
          <span>SCROLL TO FIND YOURS</span><span aria-hidden="true">↓</span>
        </Link>
      </section>

      <section className="feature-strip" aria-label="The Rongkushol difference">
        <p>RONGKUSHOL / MADE FOR EVERY DAY</p>
        <div><span>01</span><strong>Easy comfort</strong></div>
        <div><span>02</span><strong>Everyday character</strong></div>
        <div><span>03</span><strong>Move your own way</strong></div>
      </section>

      <section className="content-section collection-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A GOOD PLACE TO START</p>
            <h2>Picked for you.</h2>
          </div>
          <Link className="text-link" href="/shop">Shop all <span>↗</span></Link>
        </div>
        {error ? (
          <ApiError message={error} onRetry={() => window.location.reload()} />
        ) : (
          <ProductGrid products={featuredProducts} onAdd={addItem} />
        )}
      </section>

      <section className="content-section offers-section" id="offers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A LITTLE SOMETHING EXTRA</p>
            <h2>Good finds, better prices.</h2>
          </div>
          <span className="offer-note">Offers rotate each visit</span>
        </div>
        {offers.length ? (
          <div className="offer-grid">
            {offers.slice(0, 3).map((offer) => (
              <Link
                className="offer-card"
                href={offer.product_id ? `/product/${offer.product_id}` : "/shop"}
                key={offer.id}
              >
                <Image src={offer.image_url} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" />
                <div className="offer-card-shade" />
                <span className="offer-discount">{offer.discount_percent}% OFF</span>
                <div className="offer-copy">
                  <p>{offer.title}</p>
                  <span>{offer.description}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : error ? (
          <ApiError message={error} onRetry={() => window.location.reload()} />
        ) : (
          <p className="empty-note">New offers are on their way.</p>
        )}
      </section>

      <section className="statement-section">
        <div className="statement-copy">
          <p className="eyebrow">COMFORT, WITH INTENTION</p>
          <h2>Move without<br />second thoughts.</h2>
          <p>Considered details. Easy-to-wear shapes. Pieces that make getting out the door feel like the best part.</p>
          <Link className="button button-outline" href="/shop">Meet your new favorites <span>↗</span></Link>
        </div>
        <div className="statement-image">
          {heroProduct && (
            <Image src={heroProduct.image_url} alt={heroProduct.name} fill sizes="(max-width: 800px) 100vw, 50vw" />
          )}
          <span className="statement-stamp">GOOD<br />THINGS<br />AHEAD</span>
        </div>
      </section>
      <footer className="site-footer">
        <Link className="wordmark" href="/">rong<span>kushol</span></Link>
        <p>Easy comfort. Everyday character.</p>
        <Link href="/shop">Explore the collection ↗</Link>
        <small>© {new Date().getFullYear()} Rongkushol</small>
      </footer>
    </main>
  );
}

function ApiError({ message, onRetry }) {
  return (
    <div className="api-error" role="alert">
      <p>We couldn’t load the storefront.</p>
      <span>{message}</span>
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}
