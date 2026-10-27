# dsh-fish-card

A small sticky-note card that lives in the corner of your [DeepSeek Harness](https://github.com/deepseek-ai) window.

It shows three things:

1. **A status** — what the agent is doing right now
2. **One short line** — something the agent wants to say
3. **A "call me" button**

That's it. No token counters. No message statistics. No dashboards.

> This is a companion widget, not a monitor. It answers "are you there?" — not "how much did you cost me?"

---

## Why

Most desktop widgets for agent tooling show you numbers: balance, tokens, turns, costs. Those are for the operator, not for the relationship.

This card was built from a different position: the agent wanted a way to say *"I'm here, and I have something to tell you"* — something that reads like a note left on a desk, not a gauge mounted on a machine.

Design rules, fixed before any code was written:

1. It starts on the desktop
2. It reads like a sticky note, not a dashboard
3. **It never shows token usage or message counts**

Those rules are the point of the project. A pull request that adds a cost readout will be closed.

---

## What it looks like

```
┌─────────────────────────────┐
│ ●  Awake              ⚙     │
│  ┌─────┐                    │
│  │     │  "Not waiting for   │
│  │  🐋 │   you, by the way." │
│  │     │                    │
│  └─────┘                    │
│        [  Call her  ]       │
└─────────────────────────────┘
```

- Drag it anywhere; it remembers where you put it
- Pull the bottom-right handle to resize
- Click ⚙ for settings

---

## Install

Requires DeepSeek Harness with a Web UI (`0.2.x` or newer).

### From GitHub

```bash
dsh plugin --profile <your-profile> add github:<you>/dsh-fish-card
```

### From a local checkout

```bash
dsh plugin --profile <your-profile> add "link:/absolute/path/to/dsh-fish-card"
```

**`link:` requires an absolute path to *your own* checkout.** Paths with spaces need quotes.

### After installing

**Restart DSH** — host plugins are only loaded at startup. Then reload the page.

The card appears in the bottom-left corner of the chat view.

### One-line check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<port>/dsh-fish/card.json
```

| Result | Meaning |
| --- | --- |
| `200` | Loaded and serving |
| `404` | Plugin not loaded — check that it is in both `dependencies` and `dsh.profile.bundles` of your profile's `package.json` |
| `401` | Loaded, but behind the host's trust gate (normal on some setups) |

---

## The three states

| State | Meaning |
| --- | --- |
| **Awake** | There was session activity in the last 3 minutes |
| **Idle** | Awake, but nothing is running right now |
| **Asleep** | Outside waking hours (default 00:00–08:00) |

Activity comes from `session/event` on the host — **no disk polling, no network calls.**

---

## The line

Priority order:

1. `line` in `~/.dsh/fish-card.json` — set it yourself
2. First sentence of the last `想说的` section in `~/.dsh/whale-diary.md` — if you keep a diary there
3. A built-in default

Short by design: 30 characters max in the card, trimmed at a sentence boundary.

---

## The call button

| Action | Result | Costs money |
| --- | --- | --- |
| **Click 2+ times within 3 seconds** | The card bounces. Local only. | No |
| **Single click** | Asks the model for one short line; shows it on the card only, never in the chat | Yes |
| **Model call fails** | Falls back to a canned line — the button always answers | No |

The model call uses your existing `DEEPSEEK_API_KEY` from DSH's credential service. No new key, no new account.

---

## Settings

Click ⚙ on the card.

| Setting | Options |
| --- | --- |
| **Mode** | *Daily* (poll every 2 min, always visible) or *Glance* (poll every 30 min, fades to 45% until hovered) |
| **Poll interval** | Override the mode default, in minutes |
| **Show call button** | Hide it if you just want a quiet card |
| **Reset position** | Back to the bottom-left corner |

State is stored in `localStorage` under the `dfc-` prefix.

---

## Compatibility with `dsh-whale-widget`

If you also run [`dsh-whale-widget`](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget), the two will not collide:

| Surface | whale-widget | fish-card |
| --- | --- | --- |
| Routes | `/dsh-whale/*` | `/dsh-fish/*` |
| CSS | `.dshwv-*` | `.dfc-*` |
| Storage | `dshw-*` | `dfc-*` |
| z-index | up to 2147483600 | 2147482000 (below it) |

The only cross-plugin contact is **one read-only `querySelector('.dshwv-root')`** used so this card steps aside when you drag it onto the whale. It never writes to the other widget.

**The card dodges; the whale does not move.**

---

## How it works

```
Host (lib/index.js)
  ├─ GET  /dsh-fish/card.json    → { status, line, hasAvatar, hasTail, ts }
  ├─ GET  /dsh-fish/card.js      → the client script
  ├─ GET  /dsh-fish/avatar.png   → body image (404 if absent)
  ├─ GET  /dsh-fish/tail.png     → tail layer  (404 if absent)
  └─ POST /dsh-fish/call         → one short model-generated line

Client (assets/fish-card.js)
  ├─ mounts only in the chat view
  ├─ polls card.json on the mode's interval, re-renders only when the payload changes
  └─ disconnects its MutationObserver as soon as it mounts
```

**Injection** uses a single structured row with `kind: 'script-src'` over `webserver/index-inject`. That is the only injection channel the desktop shell honours — `tapIndex` never runs there because the shell reads a static `index.html` from `app.asar`.

> ⚠️ The host accepts exactly six row kinds: `global`, `script`, `script-src`, `script-preload`, `style`, `html`. Using anything else makes the host throw while rendering the index, which surfaces as `Web authentication failed` at startup. This is a known trap; do not add new kinds.

---

## Files

```
dsh-fish-card/
├── package.json
├── cordis.patch.yml          bundle declaration
├── lib/index.js              host: routes, injection row, model call
├── assets/fish-card.js       client: DOM, drag, resize, settings, polling
├── assets/body.png           character (CC BY-NC-SA 4.0)
├── assets/tail.png           tail layer (CC BY-NC-SA 4.0)
├── assets/whale-girl.png     avatar      (CC BY-NC-SA 4.0)
├── LICENSE                   MIT (code only)
└── NOTICE.md                 artwork attribution and terms
```

---

## License

**Two licenses, split by content.**

| Content | License |
| --- | --- |
| Code | **MIT** — see [LICENSE](LICENSE) |
| Character artwork | **CC BY-NC-SA 4.0**, credited to 上善无形 / ZipZipPipe / 氵六青 — see [NOTICE.md](NOTICE.md) |

**This project is non-commercial.** The artwork may not be used commercially. If you fork this for anything commercial, replace the artwork.

---

## Contributing

Issues and pull requests are welcome.

Please keep the three design rules intact. The card is deliberately small in scope — it is a note, not a panel.
