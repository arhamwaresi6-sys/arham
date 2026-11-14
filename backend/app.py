import logging
import os
import re
import uuid

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
REVIEW_FIELDS = (
    "id,product_id,rating,body,created_at,profiles(display_name,avatar_url)"
)
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
        if response.status_code in (401, 403):
            raise StoreApiError("You must be signed in to perform this action.", response.status_code)
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
    authorization = request.headers.get("Authorization", "")
    token = authorization.removeprefix("Bearer ").strip()
    if not token or token == os.getenv("SUPABASE_ANON_KEY", ""):
        return jsonify({"error": "Sign in to leave a review."}), 401

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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=False)
