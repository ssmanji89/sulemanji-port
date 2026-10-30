import tempfile
import unittest
from pathlib import Path

from PIL import Image

from scripts.generate_article_images import render_card, validate_custom_image


class SocialCardTests(unittest.TestCase):
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
