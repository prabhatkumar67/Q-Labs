import unittest

from app.target_urls import navigation_url, same_origin


class TargetUrlTests(unittest.TestCase):
    def test_assets_on_same_origin_are_allowed_from_nested_start(self):
        self.assertTrue(same_origin("http://localhost:3001/_next/static/app.js", "http://localhost:3001/checkout"))
        self.assertFalse(same_origin("http://localhost:3002/app.js", "http://localhost:3001/checkout"))
        self.assertFalse(same_origin("http://localhost.evil.invalid:3001/app.js", "http://localhost:3001"))
        self.assertFalse(same_origin("http://user:pass@evil.invalid:3001", "http://localhost:3001"))
        self.assertFalse(same_origin("data:text/html,example", "http://localhost:3001"))

    def test_navigation_uses_origin_not_the_starting_path(self):
        self.assertEqual(navigation_url("https://example.test/settings", "/orders"), "https://example.test/orders")
        self.assertEqual(navigation_url("http://localhost:3001/checkout", "/"), "http://localhost:3001/")

    def test_old_demo_root_plans_keep_working(self):
        self.assertEqual(navigation_url("http://127.0.0.1:8120/fixed", "/"), "http://127.0.0.1:8120/fixed/")

    def test_cross_origin_and_control_paths_are_rejected(self):
        for path in ["//other.test/", "/\\other.test/", "/bad\nheader", "https://other.test"]:
            with self.assertRaises(ValueError):
                navigation_url("https://example.test", path)
