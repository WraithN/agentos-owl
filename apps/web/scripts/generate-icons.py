#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, "src-tauri", "icons")
os.makedirs(out_dir, exist_ok=True)

size = 1240
img = Image.new("RGBA", (size, size), (15, 23, 42, 255))  # slate-900
draw = ImageDraw.Draw(img)

# Try to use a system font
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 700)
except Exception:
    font = ImageFont.load_default()

text = "A"
bbox = draw.textbbox((0, 0), text, font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
x = (size - tw) / 2
y = (size - th) / 2 - 60
draw.text((x, y), text, font=font, fill=(56, 189, 248, 255))  # sky-400

out_path = os.path.join(out_dir, "icon.png")
img.save(out_path)
print(f"Generated {out_path}")
