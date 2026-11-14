import os
import unittest
from unittest.mock import Mock, patch

os.environ.pop("SUPABASE_URL", None)
os.environ.pop("SUPABASE_ANON_KEY", None)

import app as store_app


class StoreApiTests(unittest.TestCase):
    def setUp(self):
        self.client = store_app.app.test_client()
        os.environ.pop("SUPABASE_URL", None)
        os.environ.pop("SUPABASE_ANON_KEY", None)

    def test_health_does_not_require_supabase_credentials(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "ok"})

    def test_api_allows_both_localhost_origins(self):
        response = self.client.get(
            "/api/health",
            headers={"Origin": "http://127.0.0.1:3000"},
        )
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://127.0.0.1:3000")

    def test_products_reports_missing_supabase_configuration(self):
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 503)
        self.assertIn("SUPABASE_URL", response.json["error"])

    @patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co", "SUPABASE_ANON_KEY": "public-key"})
    @patch("app.requests.request")
    def test_products_forwards_safe_filters(self, request_mock):
        response_mock = Mock(ok=True, content=b"[]")
        response_mock.json.return_value = []
        request_mock.return_value = response_mock

        response = self.client.get("/api/products?category=shoes&q=runner%3Bdelete")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])
        params = request_mock.call_args.kwargs["params"]
        self.assertEqual(params["category"], "eq.shoes")
        self.assertNotIn(";", params.get("or", ""))
        self.assertNotIn("=", params.get("or", ""))

    def test_review_creation_requires_a_valid_rating(self):
        product_id = "e6288576-c470-4c68-bdcf-96c829496ad1"
        with patch(
            "app._authenticated_user",
            return_value=({"id": "user-id", "email": "customer@example.com"}, "user-token"),
        ):
            response = self.client.post(
                f"/api/products/{product_id}/reviews",
                json={"rating": 6, "body": "Nice"},
                headers={"Authorization": "Bearer user-token"},
            )
        self.assertEqual(response.status_code, 400)
        self.assertIn("rating", response.json["error"])

    def test_review_creation_rejects_non_object_json(self):
        product_id = "e6288576-c470-4c68-bdcf-96c829496ad1"
        with patch(
            "app._authenticated_user",
            return_value=({"id": "user-id", "email": "customer@example.com"}, "user-token"),
        ):
            response = self.client.post(
                f"/api/products/{product_id}/reviews",
                json=["not", "an", "object"],
                headers={"Authorization": "Bearer user-token"},
            )
        self.assertEqual(response.status_code, 400)
        self.assertIn("JSON object", response.json["error"])

    def test_admin_routes_require_authentication(self):
        response = self.client.get("/api/admin/products")
        self.assertEqual(response.status_code, 401)

    def test_customers_cannot_manage_products(self):
        with patch(
            "app._authenticated_user",
            return_value=({"id": "customer-id", "email": "customer@example.com"}, "user-token"),
        ), patch("app._supabase_request", return_value=[{"role": "customer"}]):
            response = self.client.get("/api/admin/products")
        self.assertEqual(response.status_code, 403)
        self.assertIn("Administrator", response.json["error"])

    @patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"})
    def test_root_can_create_products(self):
        product = {
            "name": "Demo Runner",
            "brand": "Rongkushol",
            "category": "shoes",
            "price": 80,
            "compare_at_price": 100,
            "image_url": (
                "https://example.supabase.co/storage/v1/object/public/"
                "product-images/shoe-Nike-1.png"
            ),
            "description": "A demo product.",
            "features": ["Lightweight", "Comfortable"],
            "is_active": True,
            "is_featured": False,
        }
        with patch(
            "app._authenticated_user",
            return_value=({"id": "root-id", "email": "arhamwaresi6@gmail.com"}, "root-token"),
        ), patch("app._supabase_request", return_value=[{"id": "created-id", **product}]) as db_request:
            response = self.client.post("/api/admin/products", json=product)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["name"], "Demo Runner")
        db_request.assert_called_once_with(
            "products",
            method="POST",
            payload=product,
            token="root-token",
        )

    @patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"})
    def test_product_image_accepts_this_projects_public_storage_url(self):
        image_url = (
            "https://example.supabase.co/storage/v1/object/public/"
            "product-images/shoe-Nike-1.png"
        )
        self.assertEqual(
            store_app._image_path({"image_url": image_url}),
            image_url,
        )

    @patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"})
    def test_product_image_rejects_other_hosts_and_buckets(self):
        for image_url in (
            "https://attacker.example/storage/v1/object/public/product-images/shoe.png",
            "https://example.supabase.co/storage/v1/object/public/avatars/shoe.png",
            "/img/shoe-Nike-1.png",
        ):
            with self.subTest(image_url=image_url):
                with self.assertRaises(store_app.StoreApiError):
                    store_app._image_path({"image_url": image_url})

    def test_product_creation_rejects_inverted_sale_prices(self):
        product = {
            "name": "Demo Runner",
            "brand": "Rongkushol",
            "category": "shoes",
            "price": 100,
            "compare_at_price": 80,
            "image_url": "/img/shoe-Nike-1.png",
        }
        with patch(
            "app._authenticated_user",
            return_value=({"id": "root-id", "email": "arhamwaresi6@gmail.com"}, "root-token"),
        ), patch("app._supabase_request") as db_request:
            response = self.client.post("/api/admin/products", json=product)
        self.assertEqual(response.status_code, 400)
        self.assertIn("greater than or equal", response.json["error"])
        db_request.assert_not_called()

    def test_only_root_can_list_user_directory(self):
        with patch(
            "app._authenticated_user",
            return_value=({"id": "admin-id", "email": "admin@example.com"}, "admin-token"),
        ):
            response = self.client.get("/api/admin/users")
        self.assertEqual(response.status_code, 403)

    def test_invalid_product_id_returns_not_found(self):
        response = self.client.get("/api/products/not-a-uuid")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
