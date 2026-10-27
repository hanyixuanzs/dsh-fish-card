# Notices and attribution

This project mixes two different licenses. **Read both parts.**

| Scope | License |
| --- | --- |
| Source code (`lib/`, `assets/fish-card.js`, `cordis.patch.yml`, docs) | **MIT** — see [LICENSE](LICENSE) |
| Character artwork (`assets/body.png`, `assets/tail.png`, `assets/whale-girl.png`) | **CC BY-NC-SA 4.0** — see below |

The MIT license does not apply to the artwork. The CC BY-NC-SA license does not apply to the code.

---

## Character artwork

The whale-girl artwork bundled in `assets/` is a three-generation derivation. **All three authors must be credited.**

| Author | Contribution | Profile |
| --- | --- | --- |
| **上善无形** (Shangshan) | Original character design — the OC "溟月" that became the whale girl | <https://space.bilibili.com/4456176> |
| **ZipZipPipe** | Second design: the "maid whale girl" that added DeepSeek elements | <https://space.bilibili.com/4168597> |
| **氵六青** (UID 11272072) | The Live2D model this project's layered artwork derives from | <https://space.bilibili.com/11272072> |

Derivation chain:

```
上善无形 «溟月»  →  ZipZipPipe «maid whale girl»  →  氵六青 «Live2D model»
```

### License

The artwork is used under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en)
(Attribution — NonCommercial — ShareAlike).

What this means for you:

- **Attribution** — credit all three authors above, link this repository, link the CC BY-NC-SA 4.0 deed, and state if you changed anything.
- **NonCommercial** — you may not use the artwork for commercial advantage or monetary compensation.
- **ShareAlike** — if you distribute a modified version of the artwork, your contribution must be released under CC BY-NC-SA 4.0 or a compatible license.

### Modifications made in this repository

- Cropped and padded from the source layered artwork
- Background made transparent
- Resized for the card's layout (`body.png`, `tail.png`, `whale-girl.png`)
- The tail layer is animated in the UI (it is not part of the original composition)

### This project is non-commercial

Free, no fees, no ads, no merchandise, not a selling point of any paid product.

---

## What is NOT bundled

This project does **not** include, and does not require, any Live2D runtime, model files
(`.moc3`), or VTube Studio assets. Only three flattened PNG images are bundled.

If you want the full Live2D desktop pet, see
[dsh-whale-girl-live2d](https://github.com/Andersen216/dsh-whale-girl-live2d) — a different,
separately licensed project by Andersen216.

---

## Takedown

If you believe any asset here infringes your rights, please open an issue naming
**the file** and **the basis**. Verified claims will be replaced or removed without further
conditions.
