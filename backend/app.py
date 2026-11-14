import logging
import math
import os
import re
import uuid
from urllib.parse import urlsplit

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        os.getenv("FRONTEND_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000"),
    ).split(",")
    if origin.strip()
]
CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    allow_headers=["Authorization", "Content-Type"],
)

PRODUCT_FIELDS = (
    "id,name,brand,category,price,compare_at_price,image_url,description,features,"
    "is_featured"
)
ADMIN_PRODUCT_FIELDS = f"{PRODUCT_FIELDS},is_active,created_at"
REVIEW_FIELDS = (
    "id,product_id,rating,body,created_at,profiles(display_name,avatar_url)"
)
ROOT_EMAIL = "arhamwaresi6@gmail.com"
REQUEST_TIMEOUT = 8


class StoreApiError(Exception):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.status_code = status_code


def _supabase_request(resource, params=None, *, method="GET", payload=None, token=None):
    project_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not project_url or not anon_key:
        raise StoreApiError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.", 503)

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {token or anon_key}",
        "Accept": "application/json",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "return=representation"

    try:
        response = requests.request(
            method,
            f"{project_url}/rest/v1/{resource}",
            params=params,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as error:
        app.logger.exception("Supabase request failed")
        raise StoreApiError("The product database could not be reached.", 502) from error

    if not response.ok:
        app.logger.error("Supabase returned HTTP %s for %s", response.status_code, resource)
        if response.status_code == 401:
            raise StoreApiError("You must be signed in to perform this action.", response.status_code)
        if response.status_code == 403:
            raise StoreApiError("Your account is not permitted to perform this action.", response.status_code)
        raise StoreApiError("The database could not complete the request.", 502)
    if not response.content:
        return []
    try:
        return response.json()
    except requests.exceptions.JSONDecodeError as error:
        app.logger.exception("Supabase returned invalid JSON for %s", resource)
        raise StoreApiError("The database returned an invalid response.", 502) from error


def _valid_product_id(product_id):
    try:
        uuid.UUID(product_id)
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def _authenticated_user():
    authorization = request.headers.get("Authorization", "")
    token = authorization.removeprefix("Bearer ").strip()
    if not token or token == os.getenv("SUPABASE_ANON_KEY", ""):
        raise StoreApiError("Sign in to continue.", 401)

    project_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not project_url or not anon_key:
        raise StoreApiError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.", 503)
    try:
        response = requests.get(
            f"{project_url}/auth/v1/user",
            headers={"apikey": anon_key, "Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as error:
        app.logger.exception("Supabase authentication request failed")
        raise StoreApiError("The account service could not be reached.", 502) from error
    if not response.ok:
        raise StoreApiError("Your session is invalid or has expired. Sign in again.", 401)
    try:
        user = response.json()
    except requests.exceptions.JSONDecodeError as error:
        app.logger.exception("Supabase returned invalid authentication data")
        raise StoreApiError("The account service returned an invalid response.", 502) from error
    if not isinstance(user, dict) or not user.get("id") or not user.get("email"):
        raise StoreApiError("Your account could not be verified.", 401)
    return user, token


def _require_admin():
    user, token = _authenticated_user()
    if user["email"].strip().lower() == ROOT_EMAIL:
        return user, token
    profiles = _supabase_request(
        "profiles",
        {"select": "role", "user_id": f"eq.{user['id']}", "limit": 1},
        token=token,
    )
    if not profiles or profiles[0].get("role") != "admin":
        raise StoreApiError("Administrator access is required.", 403)
    return user, token


def _require_root():
    user, token = _authenticated_user()
    if user["email"].strip().lower() != ROOT_EMAIL:
        raise StoreApiError("Only the store root can manage user roles.", 403)
    return user, token


def _json_object():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise StoreApiError("Details must be sent as a JSON object.", 400)
    return payload


def _required_text(payload, field, *, maximum=160):
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
        raise StoreApiError(f"{field.replace('_', ' ').capitalize()} is required (maximum {maximum} characters).", 400)
    return value.strip()


def _image_path(payload):
    value = _required_text(payload, "image_url", maximum=240)
    image_url = urlsplit(value)
    supabase_url = urlsplit(os.getenv("SUPABASE_URL", ""))
    storage_prefix = "/storage/v1/object/public/product-images/"
    object_path = (
        image_url.path[len(storage_prefix):]
        if image_url.path.startswith(storage_prefix)
        else ""
    )
    if (
        supabase_url.scheme == "https"
        and image_url.scheme == "https"
        and image_url.netloc == supabase_url.netloc
        and object_path
        and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/-]*", object_path)
        and ".." not in object_path
        and not image_url.query
        and not image_url.fragment
    ):
        return value

    raise StoreApiError(
        "Image must use this project's public product-images bucket.",
        400,
    )


def _price(payload, field, *, optional=False):
    value = payload.get(field)
    if optional and value in (None, ""):
        return None
    error_message = f"{field.replace('_', ' ').capitalize()} must be between 0 and 99,999,999.99."
    if isinstance(value, bool):
        raise StoreApiError(error_message, 400)
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise StoreApiError(error_message, 400)
    if not math.isfinite(number) or number < 0 or number > 99_999_999.99:
        raise StoreApiError(error_message, 400)
    return number


def _product_payload(payload):
    category = payload.get("category")
    if not isinstance(category, str) or category not in {"shoes", "clothing", "bags"}:
        raise StoreApiError("Choose a valid product category.", 400)
    price = _price(payload, "price")
    compare_at_price = _price(payload, "compare_at_price", optional=True)
    if compare_at_price is not None and compare_at_price < price:
        raise StoreApiError("Compare-at price must be greater than or equal to price.", 400)
    features = payload.get("features", [])
    if (
        not isinstance(features, list)
        or len(features) > 12
        or any(not isinstance(item, str) or not item.strip() or len(item.strip()) > 120 for item in features)
    ):
        raise StoreApiError("Features must be a list of up to 12 short text items.", 400)
    description = payload.get("description", "")
    if not isinstance(description, str) or len(description) > 2000:
        raise StoreApiError("Description must be 2000 characters or fewer.", 400)
    for field in ("is_active", "is_featured"):
        if field in payload and not isinstance(payload[field], bool):
            raise StoreApiError(f"{field.replace('_', ' ').capitalize()} must be true or false.", 400)
    return {
        "name": _required_text(payload, "name"),
        "brand": _required_text(payload, "brand"),
        "category": category,
        "price": price,
        "compare_at_price": compare_at_price,
        "image_url": _image_path(payload),
        "description": description.strip(),
        "features": [item.strip() for item in features],
        "is_active": payload.get("is_active", True),
        "is_featured": payload.get("is_featured", False),
    }


def _offer_payload(payload):
    discount = payload.get("discount_percent")
    if isinstance(discount, bool) or not isinstance(discount, int) or not 1 <= discount <= 90:
        raise StoreApiError("Discount must be a whole number between 1 and 90.", 400)
    product_id = payload.get("product_id")
    if product_id not in (None, "") and not _valid_product_id(product_id):
        raise StoreApiError("Choose a valid product for this offer.", 400)
    if "is_active" in payload and not isinstance(payload["is_active"], bool):
        raise StoreApiError("Is active must be true or false.", 400)
    description = payload.get("description", "")
    if not isinstance(description, str) or len(description) > 1000:
        raise StoreApiError("Description must be 1000 characters or fewer.", 400)
    return {
        "title": _required_text(payload, "title"),
        "description": description.strip(),
        "discount_percent": discount,
        "image_url": _image_path(payload),
        "product_id": product_id or None,
        "is_active": payload.get("is_active", True),
    }


@app.errorhandler(StoreApiError)
def handle_store_api_error(error):
    return jsonify({"error": str(error)}), error.status_code


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/products")
def list_products():
    params = {
        "select": PRODUCT_FIELDS,
        "is_active": "eq.true",
        "order": "created_at.desc",
        "limit": 100,
    }
    category = request.args.get("category", "").strip().lower()
    search = request.args.get("q", "").strip()
    if category and category not in {"shoes", "clothing", "bags"}:
        return jsonify({"error": "Choose a valid product category."}), 400
    if category:
        params["category"] = f"eq.{category}"
    if search:
        safe_search = re.sub(r"[^a-zA-Z0-9 -]", "", search)[:80].strip()
        if not safe_search:
            return jsonify({"error": "Search must include letters or numbers."}), 400
        params["or"] = (
            f"(name.ilike.*{safe_search}*,brand.ilike.*{safe_search}*,"
            f"description.ilike.*{safe_search}*)"
        )
    return jsonify(_supabase_request("products", params))


@app.get("/api/products/<product_id>")
def get_product(product_id):
    if not _valid_product_id(product_id):
        return jsonify({"error": "Product not found."}), 404
    products = _supabase_request(
        "products",
        {"select": PRODUCT_FIELDS, "id": f"eq.{product_id}", "is_active": "eq.true", "limit": 1},
    )
    if not products:
        return jsonify({"error": "Product not found."}), 404
    return jsonify(products[0])


@app.get("/api/offers")
def list_offers():
    return jsonify(
        _supabase_request(
            "offers",
            {
                "select": "id,title,description,discount_percent,image_url,product_id",
                "is_active": "eq.true",
                "order": "created_at.desc",
                "limit": 50,
            },
        )
    )


@app.get("/api/products/<product_id>/reviews")
def list_reviews(product_id):
    if not _valid_product_id(product_id):
        return jsonify({"error": "Product not found."}), 404
    return jsonify(
        _supabase_request(
            "reviews",
            {
                "select": REVIEW_FIELDS,
                "product_id": f"eq.{product_id}",
                "order": "created_at.desc",
                "limit": 100,
            },
        )
    )


@app.post("/api/products/<product_id>/reviews")
def create_review(product_id):
    if not _valid_product_id(product_id):
        return jsonify({"error": "Product not found."}), 404
    try:
        _, token = _authenticated_user()
    except StoreApiError as error:
        if error.status_code == 401:
            return jsonify({"error": "Sign in to leave a review."}), 401
        raise

    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({"error": "Review details must be sent as a JSON object."}), 400
    rating = payload.get("rating")
    body = payload.get("body")
    if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
        return jsonify({"error": "Choose a rating from 1 to 5."}), 400
    if not isinstance(body, str) or not body.strip() or len(body.strip()) > 1000:
        return jsonify({"error": "Review text must be between 1 and 1000 characters."}), 400

    reviews = _supabase_request(
        "reviews",
        {"select": REVIEW_FIELDS},
        method="POST",
        payload={"product_id": product_id, "rating": rating, "body": body.strip()},
        token=token,
    )
    return jsonify(reviews[0]), 201


@app.get("/api/admin/products")
def admin_list_products():
    _, token = _require_admin()
    return jsonify(
        _supabase_request(
            "products",
            {"select": ADMIN_PRODUCT_FIELDS, "order": "created_at.desc", "limit": 200},
            token=token,
        )
    )


@app.post("/api/admin/products")
def admin_create_product():
    _, token = _require_admin()
    product = _product_payload(_json_object())
    return jsonify(
        _supabase_request("products", method="POST", payload=product, token=token)[0]
    ), 201


@app.patch("/api/admin/products/<product_id>")
def admin_update_product(product_id):
    if not _valid_product_id(product_id):
        return jsonify({"error": "Product not found."}), 404
    _, token = _require_admin()
    product = _product_payload(_json_object())
    updated = _supabase_request(
        "products",
        {"id": f"eq.{product_id}"},
        method="PATCH",
        payload=product,
        token=token,
    )
    if not updated:
        return jsonify({"error": "Product not found."}), 404
    return jsonify(updated[0])


@app.delete("/api/admin/products/<product_id>")
def admin_archive_product(product_id):
    if not _valid_product_id(product_id):
        return jsonify({"error": "Product not found."}), 404
    _, token = _require_admin()
    updated = _supabase_request(
        "products",
        {"id": f"eq.{product_id}"},
        method="PATCH",
        payload={"is_active": False},
        token=token,
    )
    if not updated:
        return jsonify({"error": "Product not found."}), 404
    return jsonify(updated[0])


@app.get("/api/admin/offers")
def admin_list_offers():
    _, token = _require_admin()
    return jsonify(
        _supabase_request(
            "offers",
            {
                "select": "id,title,description,discount_percent,image_url,product_id,is_active,created_at",
                "order": "created_at.desc",
                "limit": 200,
            },
            token=token,
        )
    )


@app.post("/api/admin/offers")
def admin_create_offer():
    _, token = _require_admin()
    offer = _offer_payload(_json_object())
    return jsonify(_supabase_request("offers", method="POST", payload=offer, token=token)[0]), 201


@app.patch("/api/admin/offers/<offer_id>")
def admin_update_offer(offer_id):
    if not _valid_product_id(offer_id):
        return jsonify({"error": "Offer not found."}), 404
    _, token = _require_admin()
    offer = _offer_payload(_json_object())
    updated = _supabase_request(
        "offers",
        {"id": f"eq.{offer_id}"},
        method="PATCH",
        payload=offer,
        token=token,
    )
    if not updated:
        return jsonify({"error": "Offer not found."}), 404
    return jsonify(updated[0])


@app.delete("/api/admin/offers/<offer_id>")
def admin_archive_offer(offer_id):
    if not _valid_product_id(offer_id):
        return jsonify({"error": "Offer not found."}), 404
    _, token = _require_admin()
    updated = _supabase_request(
        "offers",
        {"id": f"eq.{offer_id}"},
        method="PATCH",
        payload={"is_active": False},
        token=token,
    )
    if not updated:
        return jsonify({"error": "Offer not found."}), 404
    return jsonify(updated[0])


@app.get("/api/admin/users")
def admin_list_users():
    _, token = _require_root()
    directory = []
    offset = 0
    while True:
        page = _supabase_request(
            "admin_user_directory",
            {
                "select": "user_id,email,created_at",
                "order": "created_at.desc",
                "limit": 1000,
                "offset": offset,
            },
            token=token,
        )
        directory.extend(page)
        if len(page) < 1000:
            break
        offset += len(page)
    user_ids = [row["user_id"] for row in directory]
    profiles = []
    for offset in range(0, len(user_ids), 100):
        profiles.extend(_supabase_request(
            "profiles",
            {
                "select": "user_id,display_name,role",
                "user_id": f"in.({','.join(user_ids[offset:offset + 100])})",
            },
            token=token,
        ))
    profile_by_id = {profile["user_id"]: profile for profile in profiles}
    return jsonify(
        [
            {
                **row,
                "display_name": profile_by_id.get(row["user_id"], {}).get("display_name", ""),
                "role": profile_by_id.get(row["user_id"], {}).get("role", "customer"),
            }
            for row in directory
        ]
    )


@app.patch("/api/admin/users/<user_id>/role")
def admin_update_user_role(user_id):
    if not _valid_product_id(user_id):
        return jsonify({"error": "User not found."}), 404
    _, token = _require_root()
    role = _json_object().get("role")
    if not isinstance(role, str) or role not in {"admin", "customer"}:
        return jsonify({"error": "Choose either admin or customer."}), 400
    directory = _supabase_request(
        "admin_user_directory",
        {"select": "email", "user_id": f"eq.{user_id}", "limit": 1},
        token=token,
    )
    if not directory:
        return jsonify({"error": "User not found."}), 404
    if directory[0]["email"].strip().lower() == ROOT_EMAIL:
        return jsonify({"error": "Root access is tied to the root email and cannot be changed."}), 400
    updated = _supabase_request(
        "profiles",
        {"user_id": f"eq.{user_id}"},
        method="PATCH",
        payload={"role": role},
        token=token,
    )
    if not updated:
        return jsonify({"error": "User profile not found."}), 404
    return jsonify({"user_id": user_id, "role": updated[0]["role"]})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
