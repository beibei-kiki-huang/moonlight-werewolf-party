# Design assets

- **Character art:** four original portraits (Werewolf, Villager, Seer, Witch) made with an image-generation tool for this project. No stock art and no runtime image service. The prompts are in `art-prompts.json`. Production WebP files (120/360/720 px) are in `public/art/v2/`.
- **Narration:** 32 short English/Chinese clips rendered offline from MIT-licensed MeloTTS models. `approved-audio/narration-manifest.json` lists every clip, and the automated tests check it.
- **Music:** an excerpt of *Evening Fall (Piano)* by Kevin MacLeod, licensed CC BY 4.0. Credits are in `public/audio/CREDITS.txt` and `public/THIRD_PARTY_NOTICES.txt`.
