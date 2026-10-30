#!/usr/bin/env python3
"""Generate deterministic social cards for public Writing articles."""

import argparse
import datetime as dt
import os
from pathlib import Path
import tempfile

from PIL import Image, ImageDraw, ImageFont

try:
    from scripts.verify_discovery import article_inventory, publication_day
except ModuleNotFoundError:
    from verify_discovery import article_inventory, publication_day


WIDTH = 1200
HEIGHT = 630
SKY_ROUTE = "/notes/late-october-skywatching-binoculars-telescope"
SKY_IMAGE = "late-october-skywatching-binoculars-01.webp"


def validate_custom_image(source, article):
    metadata = article.get("social_image")
    if not metadata:
        return None
    path = source / metadata["path"].lstrip("/")
    if not path.is_file():
        return f"{article['permalink']}: custom social image is missing"
    try:
        with Image.open(path) as image:
            actual = image.size
            image.verify()
    except (OSError, ValueError) as error:
        return f"{article['permalink']}: custom social image is invalid: {error}"
    expected = (metadata["width"], metadata["height"])
    if actual != expected or actual != (WIDTH, HEIGHT):
        return f"{article['permalink']}: custom social image decoded dimensions must be 1200x630"
    return None


def font_path(name):
    roots = [
        Path(os.environ.get("DEJAVU_FONT_DIR", "")),
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/local/share/fonts"),
    ]
    for root in roots:
        candidate = root / name
        if root.as_posix() != "." and candidate.is_file():
            return candidate
    raise RuntimeError(f"DejaVu font not found: {name}")


def wrapped_lines(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = []
    for word in words:
        candidate = " ".join(current + [word])
        width = draw.textbbox((0, 0), candidate, font=font)[2]
        if current and width > max_width:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines


def render_card(title, author, output):
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", (WIDTH, HEIGHT), "#17232a")
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(str(font_path("DejaVuSans-Bold.ttf")), 58)
    author_font = ImageFont.truetype(str(font_path("DejaVuSans.ttf")), 30)
    kicker_font = ImageFont.truetype(str(font_path("DejaVuSans-Bold.ttf")), 24)
    draw.rounded_rectangle((56, 54, 1144, 576), radius=24, fill="#f7f6f2")
    draw.text((104, 102), "WRITING", font=kicker_font, fill="#a64b2a")
    lines = wrapped_lines(draw, title, title_font, 982)
    if len(lines) > 4:
        raise ValueError(f"title does not fit social card: {title}")
    y = 174
    for line in lines:
        draw.text((104, y), line, font=title_font, fill="#17232a")
        y += 78
    draw.line((104, 500, 1096, 500), fill="#c7c2b8", width=2)
    draw.text((104, 522), f"By {author}", font=author_font, fill="#4a555b")
    image.save(output, format="PNG", optimize=False, compress_level=9)


def generate(source, *, as_of, check=False):
    source = Path(source).resolve()
    output_dir = source / "assets" / "images" / "articles"
    dated, legacy = article_inventory(source, as_of)
    failures = []
    with tempfile.TemporaryDirectory(prefix="article-cards-") as temporary:
        for article in dated + legacy:
            route = article["permalink"]
            custom_failure = validate_custom_image(source, article)
            if article.get("social_image"):
                if custom_failure:
                    failures.append(custom_failure)
                continue
            if route == SKY_ROUTE:
                path = output_dir / SKY_IMAGE
                if not path.is_file() or Image.open(path).size != (WIDTH, HEIGHT):
                    failures.append(f"{route}: attributed image must be 1200x630")
                continue
            name = route.rsplit("/", 1)[-1] + "-social.png"
            target = output_dir / name
            generated = Path(temporary) / name if check else target
            render_card(article["title"], "Suleman Manji", generated)
            if check and (not target.is_file() or target.read_bytes() != generated.read_bytes()):
                failures.append(f"{route}: generated social card is stale or missing")
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--as-of", type=dt.date.fromisoformat, default=publication_day())
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    failures = generate(args.source, as_of=args.as_of, check=args.check)
    if failures:
        print("\n".join("FAIL " + failure for failure in failures))
        return 1
    print("PASS article social cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
