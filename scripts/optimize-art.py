"""Prepare the approved original illustrations for mobile delivery. No extra packages installed."""
from pathlib import Path
from PIL import Image
import argparse

ROOT = Path(__file__).resolve().parents[1]
ROLES = ['werewolf', 'villager', 'seer', 'witch']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--collection', choices=['v1', 'v2'], default='v2')
collection = parser.parse_args().collection
originals = ROOT / 'design' / ('review-v2/sources' if collection == 'v2' else 'art-source')
output = ROOT / 'public' / 'art' / ('v2' if collection == 'v2' else '')
originals.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
for role in ROLES:
    original = originals / f'{role}{"-v2" if collection == "v2" else ""}.png'
    with Image.open(original) as source:
        image = source.convert('RGB')
        for width, quality in [(360, 76), (720, 80), (120, 74)]:
            resized = image.resize((width, width * 3 // 2), Image.Resampling.LANCZOS)
            target = output / f'{role}-{width}.webp'
            resized.save(target, 'WEBP', quality=quality, method=6)
            print(f'{target.relative_to(ROOT)}: {target.stat().st_size / 1024:.1f} KiB')
