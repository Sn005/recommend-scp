#!/usr/bin/env python3
"""
SCPicks アイコン生成スクリプト
白背景 (#FFFFFF) + 青文字 (#3B82F6) の「SCP」テキストロゴを各サイズで生成
"""

from PIL import Image, ImageDraw, ImageFont
import os

# --- 設定 ---
BG_COLOR = (255, 255, 255)       # #FFFFFF 白
TEXT_COLOR = (59, 130, 246)      # #3B82F6 青
TEXT = "SCP"
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
MASTER_SIZE = 1024  # マスター画像サイズ

# 出力先
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "apps", "web", "public")
OUTPUTS = {
    "icon-512": (os.path.join(BASE_DIR, "icons", "icon-512x512.png"), 512),
    "icon-192": (os.path.join(BASE_DIR, "icons", "icon-192x192.png"), 192),
    "apple-touch": (os.path.join(BASE_DIR, "apple-touch-icon.png"), 180),
    "favicon": (os.path.join(BASE_DIR, "favicon.ico"), 32),
}


def create_master_icon(size: int) -> Image.Image:
    """マスターアイコンを生成"""
    img = Image.new("RGB", (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # フォントサイズを調整（アイコンの約45%の高さ）
    font_size = int(size * 0.35)
    font = ImageFont.truetype(FONT_PATH, font_size)

    # テキストの描画位置を計算（中央配置）
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) / 2 - bbox[0]
    y = (size - text_height) / 2 - bbox[1]

    draw.text((x, y), TEXT, fill=TEXT_COLOR, font=font)

    return img


def main():
    print("SCPicks アイコン生成開始...")

    # マスター画像を生成
    master = create_master_icon(MASTER_SIZE)
    print(f"  マスター画像生成: {MASTER_SIZE}x{MASTER_SIZE}")

    for name, (path, size) in OUTPUTS.items():
        abs_path = os.path.abspath(path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        # リサイズ
        resized = master.resize((size, size), Image.LANCZOS)

        if name == "favicon":
            # ICO形式で保存
            resized.save(abs_path, format="ICO", sizes=[(size, size)])
            print(f"  {name}: {abs_path} ({size}x{size}, ICO)")
        else:
            # PNG形式で保存
            resized.save(abs_path, format="PNG")
            print(f"  {name}: {abs_path} ({size}x{size}, PNG)")

    print("アイコン生成完了!")


if __name__ == "__main__":
    main()
