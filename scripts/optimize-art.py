"""Prepare the approved original illustrations for mobile delivery. No extra packages installed."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ROLES = ['werewolf', 'villager', 'seer', 'witch']
originals = ROOT / 'design' / 'art-source'
output = ROOT / 'public' / 'art'
originals.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
for role in ROLES:
    original = originals / f'{role}.png'
    with Image.open(original) as source:
        image = source.convert('RGB')
        for width, quality in [(360, 76), (720, 80), (120, 74)]:
            resized = image.resize((width, width * 3 // 2), Image.Resampling.LANCZOS)
            target = output / f'{role}-{width}.webp'
            resized.save(target, 'WEBP', quality=quality, method=6)
            print(f'{target.relative_to(ROOT)}: {target.stat().st_size / 1024:.1f} KiB')
