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
        response = self.client.post(
            f"/api/products/{product_id}/reviews",
            json={"rating": 6, "body": "Nice"},
            headers={"Authorization": "Bearer user-token"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("rating", response.json["error"])

    def test_review_creation_rejects_non_object_json(self):
        product_id = "e6288576-c470-4c68-bdcf-96c829496ad1"
        response = self.client.post(
            f"/api/products/{product_id}/reviews",
            json=["not", "an", "object"],
            headers={"Authorization": "Bearer user-token"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("JSON object", response.json["error"])

    def test_invalid_product_id_returns_not_found(self):
        response = self.client.get("/api/products/not-a-uuid")
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
