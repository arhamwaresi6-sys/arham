"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest, readablePrice } from "../../lib/api";

const ROOT_EMAIL = "arhamwaresi6@gmail.com";
const imageOptions = [
  "/img/shoe-Nike-1.png",
  "/img/shoe-Nike-2.png",
  "/img/shoe-jordan-1.png",
  "/img/shoe-jordan-2.png",
  "/img/shoe-newBalance-1.png",
  "/img/shoe-puma-1.png",
  "/img/shoe-offer-1.png",
  "/img/shoe-offer-2.png",
  "/img/shoe-offer-3.png",
  "/img/cloth-png-black1.png",
  "/img/cloth-png-green1.png",
  "/img/handbag-png-green1.png",
  "/img/handbag-png-pink1.png",
];

function emptyProduct() {
  return {
    name: "",
    brand: "",
    category: "shoes",
    price: "",
    compare_at_price: "",
    image_url: imageOptions[0],
    description: "",
    features: "",
    is_active: true,
    is_featured: false,
  };
}

function emptyOffer() {
  return {
    title: "",
    description: "",
    discount_percent: "15",
    image_url: "/img/shoe-offer-1.png",
    product_id: "",
    is_active: true,
  };
}

function productForm(product) {
  return {
    ...product,
    price: String(product.price),
    compare_at_price: product.compare_at_price == null ? "" : String(product.compare_at_price),
    features: (product.features || []).join(", "),
  };
}

function offerForm(offer) {
  return {
    ...offer,
    discount_percent: String(offer.discount_percent),
    product_id: offer.product_id || "",
  };
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, client } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [root, setRoot] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [section, setSection] = useState("products");
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [users, setUsers] = useState([]);
  const [product, setProduct] = useState(emptyProduct);
  const [offer, setOffer] = useState(emptyOffer);
  const [editingProduct, setEditingProduct] = useState("");
  const [editingOffer, setEditingOffer] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;

    async function loadPanel() {
      setCheckingAccess(true);
      setError("");
      try {
        const isRoot = user.email?.trim().toLowerCase() === ROOT_EMAIL;
        let isAdministrator = isRoot;
        if (!isRoot) {
          if (!client) throw new Error("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart Next.js.");
          const { data, error: profileError } = await client
            .from("profiles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileError) throw profileError;
          isAdministrator = data?.role === "admin";
        }
        if (!active) return;
        setRoot(isRoot);
        setAuthorized(isAdministrator);
        if (!isAdministrator) return;

        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session expired. Sign in again.");
        const headers = { Authorization: `Bearer ${token}` };
        const requests = [
          apiRequest("/admin/products", { headers }),
          apiRequest("/admin/offers", { headers }),
        ];
        if (isRoot) requests.push(apiRequest("/admin/users", { headers }));
        const [productRows, offerRows, userRows = []] = await Promise.all(requests);
        if (!active) return;
        setProducts(productRows);
        setOffers(offerRows);
        setUsers(userRows);
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load the admin panel.");
      } finally {
        if (active) setCheckingAccess(false);
      }
    }

    loadPanel();
    return () => {
      active = false;
    };
  }, [client, loading, user]);

  async function adminRequest(path, options = {}) {
    if (!client) throw new Error("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart Next.js.");
    const { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    const token = data.session?.access_token;
    if (!token) throw new Error("Your session expired. Sign in again.");
    return apiRequest(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  }

  function reportError(actionError) {
    setError(actionError.message || "The change could not be saved.");
    setNotice("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const payload = {
      ...product,
      price: Number(product.price),
      compare_at_price: product.compare_at_price === "" ? null : Number(product.compare_at_price),
      features: product.features.split(",").map((feature) => feature.trim()).filter(Boolean),
    };
    try {
      const saved = await adminRequest(
        editingProduct ? `/admin/products/${editingProduct}` : "/admin/products",
        { method: editingProduct ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setProduct(emptyProduct());
      setEditingProduct("");
      setNotice(editingProduct ? "Product updated." : "Product added to the catalog.");
    } catch (saveError) {
      reportError(saveError);
    } finally {
      setBusy(false);
    }
  }

  async function saveOffer(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const payload = {
      ...offer,
      discount_percent: Number(offer.discount_percent),
      product_id: offer.product_id || null,
    };
    try {
      const saved = await adminRequest(
        editingOffer ? `/admin/offers/${editingOffer}` : "/admin/offers",
        { method: editingOffer ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setOffers((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setOffer(emptyOffer());
      setEditingOffer("");
      setNotice(editingOffer ? "Offer updated." : "Offer added to the storefront.");
    } catch (saveError) {
      reportError(saveError);
    } finally {
      setBusy(false);
    }
  }

  async function archiveItem(kind, item) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = kind === "products"
        ? {
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: Number(item.price),
            compare_at_price: item.compare_at_price,
            image_url: item.image_url,
            description: item.description,
            features: item.features || [],
            is_active: !item.is_active,
            is_featured: item.is_featured,
          }
        : {
            title: item.title,
            description: item.description,
            discount_percent: item.discount_percent,
            image_url: item.image_url,
            product_id: item.product_id,
            is_active: !item.is_active,
          };
      const saved = await adminRequest(`/admin/${kind}/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (kind === "products") {
        setProducts((current) => current.map((row) => row.id === saved.id ? saved : row));
      } else {
        setOffers((current) => current.map((row) => row.id === saved.id ? saved : row));
      }
      setNotice(`${kind === "products" ? "Product" : "Offer"} ${saved.is_active ? "restored" : "archived"}.`);
    } catch (actionError) {
      reportError(actionError);
    } finally {
      setBusy(false);
    }
  }

  async function changeUserRole(targetUser, role) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${targetUser.user_id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers((current) => current.map((row) =>
        row.user_id === targetUser.user_id ? { ...row, role } : row,
      ));
      setNotice(`${targetUser.email} is now ${role === "admin" ? "an admin" : "a customer"}.`);
    } catch (actionError) {
      reportError(actionError);
    } finally {
      setBusy(false);
    }
  }

  if (loading || checkingAccess || (!user && !loading)) {
    return <main className="page-shell loading-state" aria-live="polite">Checking admin access…</main>;
  }

  if (!authorized) {
    return (
      <main className="page-shell">
        <section className="admin-denied">
          <p className="eyebrow">STORE ACCESS</p>
          <h1>This area is for the store team.</h1>
          <p>{error || "Your account doesn’t have administrator access."}</p>
          <Link className="button button-dark" href="/shop">Back to the shop</Link>
        </section>
      </main>
    );
  }

  const filteredUsers = users.filter((item) =>
    `${item.email} ${item.display_name}`.toLowerCase().includes(userSearch.trim().toLowerCase()),
  );

  return (
    <main className="page-shell admin-page">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">RONGKUSHOL / STORE TOOLS</p>
          <h1>Admin panel<span>.</span></h1>
          <p>Manage your catalog and keep the storefront fresh.</p>
        </div>
        <Link className="text-link" href="/shop">View storefront <span>↗</span></Link>
      </div>

      <div className="admin-stats" aria-label="Store overview">
        <div><span>Products</span><strong>{products.filter((item) => item.is_active).length}</strong></div>
        <div><span>Active offers</span><strong>{offers.filter((item) => item.is_active).length}</strong></div>
        {root && <div><span>Customers</span><strong>{users.length}</strong></div>}
      </div>

      <nav className="admin-tabs" aria-label="Admin sections">
        <button type="button" className={section === "products" ? "active" : ""} onClick={() => setSection("products")}>Products</button>
        <button type="button" className={section === "offers" ? "active" : ""} onClick={() => setSection("offers")}>Offers</button>
        {root && <button type="button" className={section === "users" ? "active" : ""} onClick={() => setSection("users")}>Users <span>{users.length}</span></button>}
      </nav>

      {error && <p className="admin-message error-message" role="alert">{error}</p>}
      {notice && <p className="admin-message success-message" role="status">{notice}</p>}

      {section === "products" && (
        <section className="admin-workspace">
          <form className="admin-form" onSubmit={saveProduct}>
            <div className="admin-form-heading">
              <div><p className="eyebrow">{editingProduct ? "EDIT THE CATALOG" : "GROW THE CATALOG"}</p><h2>{editingProduct ? "Update product" : "Add a product"}</h2></div>
              {editingProduct && <button className="admin-text-button" type="button" onClick={() => { setEditingProduct(""); setProduct(emptyProduct()); }}>Cancel edit</button>}
            </div>
            <label>Product name<input value={product.name} onChange={(event) => setProduct({ ...product, name: event.target.value })} maxLength={160} required /></label>
            <div className="admin-form-row">
              <label>Brand<input value={product.brand} onChange={(event) => setProduct({ ...product, brand: event.target.value })} maxLength={160} required /></label>
              <label>Category<select value={product.category} onChange={(event) => setProduct({ ...product, category: event.target.value })}><option value="shoes">Shoes</option><option value="clothing">Clothing</option><option value="bags">Bags</option></select></label>
            </div>
            <div className="admin-form-row">
              <label>Price (USD)<input type="number" min="0" step="0.01" value={product.price} onChange={(event) => setProduct({ ...product, price: event.target.value })} required /></label>
              <label>Compare-at price<input type="number" min="0" step="0.01" value={product.compare_at_price} onChange={(event) => setProduct({ ...product, compare_at_price: event.target.value })} /></label>
            </div>
            <label>Product image<select value={product.image_url} onChange={(event) => setProduct({ ...product, image_url: event.target.value })}>{imageOptions.map((image) => <option value={image} key={image}>{image.replace("/img/", "")}</option>)}</select></label>
            <label>Description<textarea value={product.description} onChange={(event) => setProduct({ ...product, description: event.target.value })} rows="3" maxLength={2000} /></label>
            <label>Features <span className="admin-field-hint">Separate each feature with a comma.</span><input value={product.features} onChange={(event) => setProduct({ ...product, features: event.target.value })} placeholder="Lightweight, Breathable, Everyday comfort" /></label>
            <div className="admin-checks">
              <label><input type="checkbox" checked={product.is_featured} onChange={(event) => setProduct({ ...product, is_featured: event.target.checked })} /> Featured</label>
              <label><input type="checkbox" checked={product.is_active} onChange={(event) => setProduct({ ...product, is_active: event.target.checked })} /> Visible in shop</label>
            </div>
            <button className="button button-dark admin-submit" type="submit" disabled={busy}>{busy ? "Saving…" : editingProduct ? "Save product" : "Add product"}</button>
          </form>

          <section className="admin-records" aria-label="Products">
            <div className="admin-records-heading"><div><p className="eyebrow">YOUR CATALOG</p><h2>Products <span>{products.length}</span></h2></div></div>
            {products.length ? products.map((item) => (
              <article className={`admin-record${item.is_active ? "" : " is-archived"}`} key={item.id}>
                <Image src={item.image_url} alt="" width={68} height={68} />
                <div className="admin-record-copy"><p className="eyebrow">{item.brand} / {item.category}</p><h3>{item.name}</h3><p>{readablePrice(item.price)}{item.compare_at_price && <span className="price-was">{readablePrice(item.compare_at_price)}</span>}</p></div>
                <div className="admin-record-actions"><span className={`admin-status${item.is_active ? " live" : ""}`}>{item.is_active ? "Live" : "Archived"}</span><button type="button" disabled={busy} onClick={() => { setEditingProduct(item.id); setProduct(productForm(item)); }}>Edit</button><button type="button" disabled={busy} onClick={() => archiveItem("products", item)}>{item.is_active ? "Archive" : "Restore"}</button></div>
              </article>
            )) : <p className="empty-note">No products yet. Add the first one here.</p>}
          </section>
        </section>
      )}

      {section === "offers" && (
        <section className="admin-workspace">
          <form className="admin-form" onSubmit={saveOffer}>
            <div className="admin-form-heading">
              <div><p className="eyebrow">{editingOffer ? "UPDATE AN OFFER" : "MAKE IT A GOOD DEAL"}</p><h2>{editingOffer ? "Edit offer" : "Add an offer"}</h2></div>
              {editingOffer && <button className="admin-text-button" type="button" onClick={() => { setEditingOffer(""); setOffer(emptyOffer()); }}>Cancel edit</button>}
            </div>
            <label>Offer title<input value={offer.title} onChange={(event) => setOffer({ ...offer, title: event.target.value })} maxLength={160} required /></label>
            <label>Description<textarea value={offer.description} onChange={(event) => setOffer({ ...offer, description: event.target.value })} rows="3" maxLength={1000} /></label>
            <div className="admin-form-row">
              <label>Discount (%)<input type="number" min="1" max="90" step="1" value={offer.discount_percent} onChange={(event) => setOffer({ ...offer, discount_percent: event.target.value })} required /></label>
              <label>Product<select value={offer.product_id} onChange={(event) => setOffer({ ...offer, product_id: event.target.value })}><option value="">All products</option>{products.filter((item) => item.is_active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            </div>
            <label>Offer image<select value={offer.image_url} onChange={(event) => setOffer({ ...offer, image_url: event.target.value })}>{imageOptions.map((image) => <option value={image} key={image}>{image.replace("/img/", "")}</option>)}</select></label>
            <div className="admin-checks"><label><input type="checkbox" checked={offer.is_active} onChange={(event) => setOffer({ ...offer, is_active: event.target.checked })} /> Visible on storefront</label></div>
            <button className="button button-dark admin-submit" type="submit" disabled={busy}>{busy ? "Saving…" : editingOffer ? "Save offer" : "Add offer"}</button>
          </form>

          <section className="admin-records" aria-label="Offers">
            <div className="admin-records-heading"><div><p className="eyebrow">STORE PROMOTIONS</p><h2>Offers <span>{offers.length}</span></h2></div></div>
            {offers.length ? offers.map((item) => (
              <article className={`admin-record${item.is_active ? "" : " is-archived"}`} key={item.id}>
                <Image src={item.image_url} alt="" width={68} height={68} />
                <div className="admin-record-copy"><p className="eyebrow">{item.discount_percent}% OFF</p><h3>{item.title}</h3><p>{item.description}</p></div>
                <div className="admin-record-actions"><span className={`admin-status${item.is_active ? " live" : ""}`}>{item.is_active ? "Live" : "Archived"}</span><button type="button" disabled={busy} onClick={() => { setEditingOffer(item.id); setOffer(offerForm(item)); }}>Edit</button><button type="button" disabled={busy} onClick={() => archiveItem("offers", item)}>{item.is_active ? "Archive" : "Restore"}</button></div>
              </article>
            )) : <p className="empty-note">No offers yet. Add one to highlight a deal.</p>}
          </section>
        </section>
      )}

      {section === "users" && root && (
        <section className="admin-users">
          <div className="admin-records-heading"><div><p className="eyebrow">ROOT ACCESS</p><h2>Users <span>{users.length}</span></h2><p>Promote trusted accounts to admin or return them to customer access.</p></div></div>
          <label className="admin-user-search">Search users<input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Name or email" /></label>
          <div className="admin-user-list">
            {filteredUsers.map((item) => {
              const isRootUser = item.email?.trim().toLowerCase() === ROOT_EMAIL;
              return (
                <article className="admin-user-row" key={item.user_id}>
                  <div><h3>{item.display_name || "New customer"}{isRootUser && <span className="admin-root-badge">Root</span>}</h3><p>{item.email}</p></div>
                  {isRootUser ? <span className="admin-status live">Root</span> : <label className="admin-role-select"><span className="sr-only">Role for {item.email}</span><select value={item.role} disabled={busy} onChange={(event) => changeUserRole(item, event.target.value)}><option value="customer">Customer</option><option value="admin">Admin</option></select></label>}
                </article>
              );
            })}
            {!filteredUsers.length && <p className="empty-note">No matching users.</p>}
          </div>
        </section>
      )}
    </main>
  );
}
