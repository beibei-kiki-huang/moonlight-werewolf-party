"""Package review-only originals and efficient previews, without altering production assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import shutil
ROOT = Path(__file__).resolve().parent
GEN = Path('/Users/kiki/.codex/generated_images/01a184a6-b336-7cd0-9cfc-b5e8da526b2f')
FILES = {
    'werewolf': 'exec-8c466807-3e81-46a7-8744-e95b29f4f0ae.png',
    'villager': 'exec-1b89e48b-87e4-461f-8789-8237bfbe869a.png',
    'seer': 'exec-76ef492c-8b91-4161-90ad-d48ff1d92932.png',
    'witch': 'exec-f3cf680f-d5f4-4b34-b318-9968ea3b3d6f.png',
}
TITLES = {
    'werewolf': ('Werewolf', 'The Hunter'),
    'villager': ('Villager', 'The Ordinary Hero'),
    'seer': ('Seer', 'The Divine Oracle'),
    'witch': ('Witch', 'The Keeper of Life and Death'),
}
(ROOT/'sources').mkdir(exist_ok=True)
(ROOT/'previews').mkdir(exist_ok=True)
for role, filename in FILES.items():
    target = ROOT/'sources'/f'{role}-v2.png'
    if not target.exists(): shutil.copy2(GEN/filename, target)
    with Image.open(target) as original:
        for width, quality in [(360, 78), (720, 82)]:
            image = original.convert('RGB').resize((width, width*3//2), Image.Resampling.LANCZOS)
            output = ROOT/'previews'/f'{role}-v2-{width}.webp'
            image.save(output, 'WEBP', quality=quality, method=6)
            print(f'{output.name}: {output.stat().st_size/1024:.1f} KiB')

# Review layout only: original art pixels remain intact; titles sit outside each image.
board = Image.new('RGB', (920, 1556), '#0c111e')
draw = ImageDraw.Draw(board)
serif = '/System/Library/Fonts/Supplemental/Georgia.ttf'
sans = '/System/Library/Fonts/Supplemental/Arial.ttf'
title = ImageFont.truetype(serif, 34)
caption = ImageFont.truetype(sans, 16)
header = ImageFont.truetype(serif, 35)
draw.text((40, 25), 'Moonlight · Character Collection II', font=header, fill='#e5dff1')
draw.text((42, 73), 'REVIEW SET  /  ORIGINAL STORYBOOK ILLUSTRATIONS  /  NOT DEPLOYED', font=caption, fill='#aa9dbd')
for index, (role, _) in enumerate(FILES.items()):
    x = 40 + (index % 2)*460
    y = 122 + (index // 2)*708
    with Image.open(ROOT/'sources'/f'{role}-v2.png') as original:
        image = original.convert('RGB').resize((380,570),Image.Resampling.LANCZOS)
        board.paste(image,(x,y))
    draw.text((x+190,y+586),TITLES[role][0],font=title,fill='#e8e1f1',anchor='mt')
    draw.text((x+190,y+629),TITLES[role][1],font=caption,fill='#a99abf',anchor='mt')
board.save(ROOT/'collection-v2.webp','WEBP',quality=88,method=6)
print('Review collection:',ROOT/'collection-v2.webp')
