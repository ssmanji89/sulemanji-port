import tempfile
import unittest
from pathlib import Path

from PIL import Image

from scripts.generate_article_images import render_card


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


if __name__ == "__main__":
    unittest.main()
