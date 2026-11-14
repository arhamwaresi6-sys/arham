"use client";

import Image from "next/image";
import Link from "next/link";
import { readablePrice } from "../lib/api";

export default function ProductCard({ product, onAdd }) {
  const discounted =
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price);

  return (
    <article className="product-card">
      <Link
        href={`/product/${product.id}`}
        className="product-card-image"
        aria-label={`View ${product.name}`}
      >
        {discounted && <span className="card-tag">On offer</span>}
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 42vw, 25vw"
        />
      </Link>
      <div className="product-card-info">
        <div>
          <p className="eyebrow">{product.brand}</p>
          <Link href={`/product/${product.id}`} className="product-name">
            {product.name}
          </Link>
          <p className="product-category">{product.category}</p>
        </div>
        <p className="product-price">
          {readablePrice(product.price)}
          {discounted && (
            <span className="price-was">{readablePrice(product.compare_at_price)}</span>
          )}
        </p>
      </div>
      {onAdd && (
        <button className="quick-add" type="button" onClick={() => onAdd(product)}>
          Add to bag <span aria-hidden="true">+</span>
        </button>
      )}
    </article>
  );
}
