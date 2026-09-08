"""
Regenerate Android launcher icons from the WebNest Studio brand mark.

Source of truth: the logo shipped on the website (.reference/frontend/src/assets/logo.png).
Outputs legacy square + round bitmaps for every density, plus an Android 8+
adaptive icon (solid ink background + inset foreground mark).

Run from the app root:  python scripts/gen-launcher-icons.py
Requires: Pillow  (pip install Pillow)
"""

from __future__ import annotations

import pathlib
import shutil

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
SOURCE = REPO_ROOT / ".reference" / "frontend" / "src" / "assets" / "logo.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
APP_ASSET = ROOT / "src" / "assets" / "logo.png"

# Brand ink — matches web --color-ink-950 and the app background.
INK = (5, 6, 9, 255)

# px per density for the finished launcher icon (48dp baseline).
LEGACY = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive icon canvas is 108dp; the inner 72dp is the guaranteed-safe zone.
ADAPTIVE = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def _load_mark() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"brand mark not found: {SOURCE}")
    return Image.open(SOURCE).convert("RGBA")


def _square_on_ink(mark: Image.Image, size: int, mark_ratio: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), INK)
    inner = max(1, round(size * mark_ratio))
    scaled = mark.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.alpha_composite(scaled, (offset, offset))
    return canvas


def _round_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def _foreground(mark: Image.Image, size: int) -> Image.Image:
    # Transparent canvas so the adaptive background colour shows through and the
    # OS mask (circle / squircle / rounded square) can do its thing.
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = round(size * 0.62)
    scaled = mark.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.alpha_composite(scaled, (offset, offset))
    return canvas


def main() -> None:
    mark = _load_mark()

    for folder, size in LEGACY.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)

        square = _square_on_ink(mark, size, mark_ratio=0.86)
        square.save(out_dir / "ic_launcher.png")

        rounded = square.copy()
        rounded.putalpha(_round_mask(size))
        rounded.save(out_dir / "ic_launcher_round.png")

        fg = _foreground(mark, ADAPTIVE[folder])
        fg.save(out_dir / "ic_launcher_foreground.png")
        print(f"{folder}: {size}px legacy + {ADAPTIVE[folder]}px foreground")

    anydpi = RES / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    adaptive_xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
        '</adaptive-icon>\n'
    )
    (anydpi / "ic_launcher.xml").write_text(adaptive_xml, encoding="utf-8")
    (anydpi / "ic_launcher_round.xml").write_text(adaptive_xml, encoding="utf-8")

    colors = RES / "values" / "colors.xml"
    colors.parent.mkdir(parents=True, exist_ok=True)
    colors.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        '    <color name="ic_launcher_background">#050609</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )
    print("wrote mipmap-anydpi-v26 + values/colors.xml")

    # In-app logo asset — downscaled copy so the JS bundle stays lean.
    APP_ASSET.parent.mkdir(parents=True, exist_ok=True)
    mark.resize((512, 512), Image.LANCZOS).save(APP_ASSET)
    print(f"wrote {APP_ASSET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
