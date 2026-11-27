import datetime as dt
import tempfile
import unittest
from PIL.PngImagePlugin import PngInfo
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from scripts.generate_article_images import font_path, generate, render_card, validate_custom_image


class SocialCardTests(unittest.TestCase):
    def test_default_font_path_uses_repository_pinned_dejavu(self):
        with tempfile.TemporaryDirectory() as override:
            Path(override, "DejaVuSans.ttf").write_bytes(b"environment override")
            with patch.dict("os.environ", {"DEJAVU_FONT_DIR": override}):
                self.assertEqual(
                    Path(__file__).resolve().parents[1] / "fonts" / "DejaVuSans.ttf",
                    font_path("DejaVuSans.ttf"),
                )

    def test_write_missing_creates_absent_and_refreshes_stale_cards(self):
        article = {"permalink": "/notes/example", "title": "Example", "social_image": None}
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            target = source / "assets" / "images" / "articles" / "example-social.png"
            def fake_render(title, author, output):
                output = Path(output)
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(b"generated")
            with patch("scripts.generate_article_images.article_inventory", return_value=([article], [])), patch("scripts.generate_article_images.render_card", side_effect=fake_render) as render:
                generate(source, as_of=dt.date(2026, 11, 2), write_missing=True)
                self.assertEqual(b"generated", target.read_bytes())
                target.write_bytes(b"stale")
                generate(source, as_of=dt.date(2026, 11, 2), write_missing=True)
                self.assertEqual(b"generated", target.read_bytes())
                self.assertEqual(2, render.call_count)

    def test_check_accepts_equivalent_pixels_with_different_png_metadata(self):
        article = {"permalink": "/notes/example", "title": "Example", "social_image": None}
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            target = source / "assets" / "images" / "articles" / "example-social.png"
            target.parent.mkdir(parents=True)
            render_card("Example", "Suleman Manji", target)
            with Image.open(target) as image:
                equivalent = image.copy()
            metadata = PngInfo()
            metadata.add_text("generator", "different encoder")
            equivalent.save(target, pnginfo=metadata)
            with patch("scripts.generate_article_images.article_inventory", return_value=([article], [])):
                self.assertEqual([], generate(source, as_of=dt.date(2026, 11, 2), check=True))

    def test_card_is_deterministic_1200_by_630(self):
        with tempfile.TemporaryDirectory() as temp:
            first = Path(temp) / "first.png"
            second = Path(temp) / "second.png"
            render_card('A title with "quoted text"', "Suleman Manji", first)
            render_card('A title with "quoted text"', "Suleman Manji", second)

            self.assertEqual(first.read_bytes(), second.read_bytes())
            with Image.open(first) as image:
                self.assertEqual((1200, 630), image.size)

    def test_custom_image_decodes_declared_dimensions(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            target = source / "assets" / "images" / "articles" / "custom.png"
            target.parent.mkdir(parents=True)
            Image.new("RGB", (640, 480)).save(target)
            article = {
                "permalink": "/notes/custom",
                "social_image": {
                    "path": "/assets/images/articles/custom.png",
                    "width": 1200,
                    "height": 630,
                },
            }

            self.assertIn("decoded dimensions", validate_custom_image(source, article))

    def test_custom_image_rejects_truncated_content(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp)
            target = source / "assets" / "images" / "articles" / "custom.png"
            target.parent.mkdir(parents=True)
            Image.new("RGB", (1200, 630)).save(target)
            target.write_bytes(target.read_bytes()[: len(target.read_bytes()) // 2])
            article = {
                "permalink": "/notes/custom",
                "social_image": {
                    "path": "/assets/images/articles/custom.png",
                    "width": 1200,
                    "height": 630,
                },
            }

            self.assertIn("invalid", validate_custom_image(source, article))


if __name__ == "__main__":
    unittest.main()
