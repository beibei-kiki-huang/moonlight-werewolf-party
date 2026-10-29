# Translation release gate — October 29, 2026

Decision: ship all ten predefined phrases in English, Simplified Chinese, Korean, Japanese and Spanish. Chat language is a local recipient preference, independent of the English/Chinese interface and narration. Stable phrase IDs, English canonical fallback, original EN/ZH text, permission checks and histories are retained. Equivalent phrases are available under a collapsed language control. No translation API, account, extra dependency or service is used. Free text remains as written; there is no Translate button claiming unsupported functionality.

## Options investigated (official documentation)

| Option | No-cost limits and reliability | Privacy / latency / mobile | Release decision |
| --- | --- | --- | --- |
| Chrome on-device Translator + Language Detector | Browser models download on demand; availability is feature- and language-pack-dependent. | Chrome's docs explicitly limit these APIs to desktop, excluding mobile. Local processing is attractive, but model downloads and iPhone/Safari coverage fail this product's access gate. | Defer; no model downloads or desktop-only half-feature. |
| DeepL API | Current support page lists a Developer trial of 1,000,000 total characters that does not reset. Legacy API Free has 500,000/month but is no longer purchasable; do not assume a new account gets that renewable tier. | Cloud requests send chat text outside the game. A server-held key, explicit provider/privacy review, quota handling, quality tests and latency measurements would be needed. No account or key was provisioned; no claim that quality or privacy passed. | Candidate for a later opt-in evaluation, not a guaranteed ongoing free release dependency. |
| MyMemory public API | Anonymous 5,000 characters/day, 50,000/day with contact email; each segment max 500 UTF-8 bytes. Shared server egress would share this small allowance. | Documented GET requests place text in request URLs; explicit language pair required. A 300-character CJK message can exceed 500 bytes. No private chat was sent. Detection, terminology fidelity, retention guarantees and reliable five-language coverage were not validated. | Does not pass the private-chat and capacity gate. |
| Self-hosted LibreTranslate | Open-source software, but models and a Python inference service are required. Hosted libretranslate.com keys require purchase. | Local control could avoid a third-party translator, but adding inference to the existing small Render Free Node service adds unmeasured startup, memory and latency costs and changes deployment dependencies. | Defer; no unapproved inference service or major runtime dependency. |
| Browser page translation / public web translators | Availability is user/browser-dependent; not an application translation API. | May translate whole screens, nicknames and terminology; cannot guarantee isolated, authorized Pack messages or per-message original/translation toggles. | User browser choice; not claimed as a Moonlight feature. |

These are feasibility findings, not measured provider benchmarks. No real or private game text was transmitted to a translation service. No provider was authorized for chat retention, and no paid plan was enabled. Static phrase tests verify all 50 strings, recipient rendering, fallback, escaping, stable history and existing packet-level Pack isolation. Native-speaker usability review is still recommended; no human review is claimed.

## Requirements for any later free-text implementation

Use opt-in on-demand requests for a message ID, never arbitrary client-provided private text. Re-authorize membership, living wolf status, active stage and deadline at both request and response delivery. Private cache keys must include room, opaque stage, authorized recipient, message and language, expire at phase closure/rematch, and never share entries with public chat. Keep original text unchanged. Enforce size/rate/time limits and a bounded room-lifetime cache; cancel stale work. Store provider keys only on the server. Explain external processing before use. Translation errors must leave the original delivered and never affect votes/actions/timing. Source detection needs an explicit uncertain/manual fallback. Test nickname/player-number protection and glossary meanings in all five languages before enabling it.

## Original terminology glossary for future quality tests

| English | 简体中文 | 한국어 | 日本語 | Español |
| --- | --- | --- | --- | --- |
| Werewolf | 狼人 | 늑대인간 | 人狼 | hombre lobo |
| Villager | 村民 | 마을 주민 | 村人 | aldeano |
| Seer | 预言家 | 예언자 | 占い師 | vidente |
| Witch | 女巫 | 마녀 | 魔女 | bruja |
| Good Team | 好人阵营 | 마을 진영 | 村人陣営 | equipo del pueblo |
| Werewolf Team | 狼人阵营 | 늑대인간 진영 | 人狼陣営 | equipo de los hombres lobo |
| Investigation | 查验 | 조사 | 占い | investigación |
| Night attack | 夜间袭击 | 야간 습격 | 夜の襲撃 | ataque nocturno |
| Elimination | 出局 | 탈락 | 脱落 | eliminación |
| Abstain | 弃票 | 기권 | 棄権 | abstenerse |
| Tie | 平票 | 동률 | 同票 | empate |
| Runoff vote | 加赛投票 | 결선 투표 | 決選投票 | votación de desempate |
| Last words | 遗言 | 유언 | 最後の発言 | últimas palabras |
| Healing potion | 解药 | 치유 물약 | 治癒の薬 | poción curativa |
| Poison potion | 毒药 | 독약 | 毒薬 | poción de veneno |

Sources checked: [Chrome Translator](https://developer.chrome.com/docs/ai/translator-api), [DeepL plans](https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans), [MyMemory limits](https://mymemory.translated.net/doc/usagelimits.php), [MyMemory specification](https://mymemory.translated.net/doc/spec.php), [LibreTranslate installation](https://docs.libretranslate.com/guides/installation/), [LibreTranslate hosted keys](https://docs.libretranslate.com/guides/manage_api_keys/).
