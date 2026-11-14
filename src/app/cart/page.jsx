"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../components/CartProvider";
import { readablePrice } from "../../lib/api";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <main className="page-shell cart-page">
      <p className="eyebrow">YOUR PICKS</p>
      <h1>Your bag<span>.</span></h1>
      {!items.length ? (
        <div className="empty-cart">
          <p>Your bag is taking a little breather.</p>
          <Link className="button button-dark" href="/shop">Find something good</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <Link className="cart-item-image" href={`/product/${item.id}`}>
                  <Image src={item.image_url} alt={item.name} fill sizes="130px" />
                </Link>
                <div className="cart-item-copy">
                  <p className="eyebrow">{item.brand}</p>
                  <Link href={`/product/${item.id}`}>{item.name}</Link>
                  <p>{readablePrice(item.price)}</p>
                  <div className="quantity-control">
                    <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    <button className="remove-item" type="button" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>
                <strong>{readablePrice(Number(item.price) * item.quantity)}</strong>
              </article>
            ))}
          </div>
          <aside className="cart-summary">
            <p className="eyebrow">THE TOTAL</p>
            <div><span>Subtotal</span><strong>{readablePrice(subtotal)}</strong></div>
            <p>Shipping and taxes are calculated at checkout.</p>
            <button className="button button-dark" type="button" disabled>Checkout not available yet</button>
            <small>This store preview does not collect payment details or place orders.</small>
            <Link className="text-link" href="/shop">Keep exploring <span>↗</span></Link>
          </aside>
        </div>
      )}
    </main>
  );
}
