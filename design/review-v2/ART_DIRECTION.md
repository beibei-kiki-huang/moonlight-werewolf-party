# Moonlight character collection · V2 review specification

Status: approved by the user on October 28, 2026. Approved for production artwork replacement. Game rules and multiplayer logic remain unchanged. Runtime variants are published under `public/art/v2/`; previous assets remain available for rollback.

- **Format:** four 2:3 portraits; centered, straight-on, waist-up; aligned face/eye height in the upper third and waist near the bottom. Ears and hat may extend above the human head silhouette.
- **Medium:** elegant dark-fantasy storybook gouache with subtle tarot influence. Broad painted planes, gentle texture, medium-low detail. Strong silhouettes readable at 180px width.
- **Palette:** midnight #101827, indigo #20263b, muted lavender #a89aba, silver #cbd0dc. Gold #d5aa58 reserved for lantern/healing light.
- **Light:** soft silver key from upper left, gentle lower-right shadows; only signature props add local glow.
- **Background:** minimal midnight blue and soft moonlight. No woodland, town, decorative star fields or extra magical objects.
- **Frame:** one thin continuous silver rectangle, approximately 24px inset on the 1024×1536 masters, lightly rounded corners; no ornaments, numbering, lettering or role names embedded in art.
- **Costume:** plain silhouettes, few folds, no elaborate embroidery or unnecessary jewelry.

| Character | Storytelling focus | Signature motif |
| --- | --- | --- |
| Werewolf — The Hunter | Secrecy, danger, nighttime hunting | Powerful silver-gray wolf; subtly luminous eyes; partially eclipsed moon behind head |
| Villager — The Ordinary Hero | Human courage, observation, search for truth | Humble masculine/androgynous adult with one warm golden lantern; no magic or supernatural symbols |
| Seer — The Divine Oracle | Divinity, wisdom, hidden identities | Hoodless sacred oracle, luminous silver halo and a single magical silver eye motif; no witch hat or potions |
| Witch — The Keeper of Life and Death | Choice between saving and taking life | Exactly two large bottles: gold healing and silver poison, equal prominence; no other magical objects |

Generate the Hunter first as the style anchor, then generate each other original card using that anchor as a style/composition reference. Inspect the full set for consistent border, character scale, lighting and detail. Keep characters distinct; the reference does not transfer wolf traits to humans.

Review outputs will be stored here as separate source images and mobile WebP previews, with the exact prompts recorded. No runtime image-generation dependency is introduced.

Gameplay stays exactly as implemented: Seer inspects one player's faction per night; Witch has one heal and one poison per game. Gender presentation is illustration only and adds no selection or game mechanic.
