"""Convert an animated GIF (or a folder of frame PNGs) into a horizontal sprite strip.

Usage:
  python3 scripts/gif-to-strip.py art/knight/animations/Walking/south public/sprites/knight/walk.png
  python3 scripts/gif-to-strip.py art/knight/animations/Idle/south public/sprites/knight/idle.png

Prints the frame count and the GIF's fps so they can be registered in app/lib/sprites.ts.
"""
import sys
from pathlib import Path

from PIL import Image, ImageSequence


def load_frames(src: Path):
    if src.is_dir():
        return [Image.open(p).convert('RGBA') for p in sorted(src.glob('*.png'))], None
    im = Image.open(src)
    frames = [f.convert('RGBA') for f in ImageSequence.Iterator(im)]
    return frames, im.info.get('duration')


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    frames, duration = load_frames(src)
    w, h = frames[0].size
    strip = Image.new('RGBA', (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (w * i, 0))
    dst.parent.mkdir(parents=True, exist_ok=True)
    strip.save(dst)
    fps = round(1000 / duration) if duration else '?'
    print(f'{dst}: {len(frames)} frames of {w}x{h}, source fps {fps}')


if __name__ == '__main__':
    main()
