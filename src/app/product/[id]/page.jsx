"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, readablePrice } from "../../../lib/api";
import { useAuth } from "../../../components/AuthProvider";
import { useCart } from "../../../components/CartProvider";

export default function ProductPage() {
  const { id } = useParams();
  const { user, client } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/products/${id}`),
      apiRequest(`/products/${id}/reviews`),
    ])
      .then(([productRow, reviewRows]) => {
        if (!active) return;
        setProduct(productRow);
        setReviews(reviewRows);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const average = useMemo(() => {
    if (!reviews.length) return null;
    return (
      reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    ).toFixed(1);
  }, [reviews]);

  async function submitReview(event) {
    event.preventDefault();
    setReviewError("");
    if (!user || !client) {
      setReviewError("Sign in to share a review.");
      return;
    }
    setSending(true);
    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const created = await apiRequest(`/products/${id}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, body }),
      });
      setReviews((current) => [created, ...current]);
      setBody("");
      setRating(5);
    } catch (requestError) {
      setReviewError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <main className="page-shell">
        <div className="api-error" role="alert">
          <p>We couldn’t load this product.</p><span>{error}</span>
          <Link className="text-link" href="/shop">Back to the shop</Link>
        </div>
      </main>
    );
  }
  if (!product) {
    return <main className="page-shell loading-state" aria-live="polite">Finding the good stuff…</main>;
  }

  return (
    <main className="page-shell product-page">
      <p className="breadcrumbs"><Link href="/shop">Shop</Link> / {product.category} / {product.name}</p>
      <section className="product-detail">
        <div className="product-detail-image">
          <Image src={product.image_url} alt={product.name} fill priority sizes="(max-width: 800px) 100vw, 55vw" />
        </div>
        <div className="product-detail-copy">
          <p className="eyebrow">{product.brand} / {product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-rating">
            {average ? <><span aria-label={`${average} out of 5 stars`}>{"★".repeat(Math.round(Number(average)))}</span> {average} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</> : "Be the first to review"}
          </p>
          <p className="detail-price">{readablePrice(product.price)}{product.compare_at_price && <span className="price-was">{readablePrice(product.compare_at_price)}</span>}</p>
          <p className="detail-description">{product.description}</p>
          <button className="button button-dark add-to-bag" type="button" onClick={() => addItem(product)}>
            Add to bag <span>{readablePrice(product.price)}</span>
          </button>
          {product.features?.length > 0 && (
            <div className="feature-list">
              <p className="eyebrow">THE DETAILS</p>
              {product.features.map((feature) => <p key={feature}><span>+</span> {feature}</p>)}
            </div>
          )}
          <p className="shipping-note">Easy everyday style. Shipping and checkout details are not yet enabled.</p>
        </div>
      </section>

      <section className="reviews-section">
        <div className="section-heading">
          <div><p className="eyebrow">REAL PEOPLE, REAL NOTES</p><h2>Reviews{average ? ` · ${average}` : ""}</h2></div>
          <span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
        </div>
        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <label>
              Your rating
              <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} {score === 1 ? "star" : "stars"}</option>)}
              </select>
            </label>
            <label className="review-text">
              Your note
              <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} placeholder="What did you think?" required />
            </label>
            <button className="button button-dark" type="submit" disabled={sending}>{sending ? "Sharing…" : "Share review"}</button>
            {reviewError && <p className="form-message error-message" role="alert">{reviewError}</p>}
          </form>
        ) : (
          <p className="empty-note"><Link href="/login">Sign in</Link> to share a review.</p>
        )}
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-card-top">
                  <strong>{review.profiles?.display_name || "Rongkushol customer"}</strong>
                  <span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                </div>
                <p>{review.body}</p>
                <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">No reviews yet. Your note could be the first.</p>
        )}
      </section>
    </main>
  );
}
