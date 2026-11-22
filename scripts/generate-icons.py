"""Generate clean PNG icons (16x16, 48x48, 128x128) for the Chrome extension."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parent.parent / "extension" / "icons"


def draw_icon(size: int) -> Image.Image:
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark rounded background
    radius = int(s * 0.22)
    draw.rounded_rectangle(
        [0, 0, s - 1, s - 1],
        radius=radius,
        fill=(18, 22, 29, 255),
        outline=(48, 58, 74, 255),
        width=max(2, int(s * 0.03)),
    )

    # Muted feed lines + slash
    line_h = max(3, int(s * 0.08))
    left = int(s * 0.22)
    top_y = int(s * 0.28)
    gap = int(s * 0.18)

    bar_color = (148, 163, 184, 255)
    accent_color = (249, 115, 22, 255)

    widths = [0.56, 0.42, 0.50]
    for idx, w_ratio in enumerate(widths):
        y = top_y + idx * gap
        right = left + int(s * w_ratio)
        draw.rounded_rectangle(
            [left, y, right, y + line_h],
            radius=line_h // 2,
            fill=bar_color if idx != 1 else (100, 116, 139, 190),
        )

    # Diagonal mute slash
    stroke = max(3, int(s * 0.09))
    draw.line(
        [(int(s * 0.22), int(s * 0.78)), (int(s * 0.78), int(s * 0.22))],
        fill=accent_color,
        width=stroke,
    )

    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 48, 128):
        icon = draw_icon(size)
        target = OUT_DIR / f"icon-{size}.png"
        icon.save(target, format="PNG")
        print(f"Generated {target} ({size}x{size})")


if __name__ == "__main__":
    main()
