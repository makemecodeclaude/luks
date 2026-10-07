# LUKS Digitales Informationszentrum

Touch information terminal for the **Luzerner Kantonsspital, Standort Luzern**.
Plain HTML/CSS/JS with no build step and no framework. Open `index.html` in a browser, or run it in Chrome kiosk mode.

## Screens

| # | Route | Content |
|---|-------|---------|
| 1 | `#/` | Start screen with a QR check-in prompt in DE/FR/IT/RM (with flags) and a QR icon. **Kein QR-Code** prints a help-desk ticket. **Mehr Informationen** goes to screen 3. A large **Ich brauche Hilfe** button offers a video call, the phone, or a volunteer guide. |
| 3 | `#/sprache` | Language choice: Deutsch 🇩🇪, Français 🇫🇷, Italiano 🇮🇹, Rumantsch 🇨🇭, English 🇺🇸, plus a field with 4 flags for other languages common in Switzerland (Português, Shqip, Español, Türkçe). |
| 4 | `#/info` | Hub with 4 buttons (site map, restaurants & menus, facilities, search) and quick-access chips. |
| 4a | `#/info/karte` | The official area plan (Arealplan V20) with interactive pins, filter chips, a "you are here" marker, a route line and the nearest location. |
| 4b | `#/info/gastro` | Feingut, Feingut Vitamins, Kafi, Foodtruck, Feingut Azzurro and XUND Bistro, each with a QR code that opens the menu page on luks.ch on the visitor's phone. |
| 4c | `#/info/services` | Toilets, accessible toilets, baby changing, pharmacy, kiosk, cash machine, cash desk and lockers, each linked to the filtered map. |
| 4d | `#/info/suche` | Search with an on-screen keyboard. It tolerates typos and understands everyday words in 9 languages ("Röntgen", "blood test", "Augenarzt", "göz doktoru" …). |

Screen 2 in the brief repeated the screen 1 text, so it is treated as the same start screen. Its sub-flows (ticket, help, scan result) open as overlays on top of it.

Every page has the help button and Home/Back buttons. After 90 s without input the terminal asks "Sind Sie noch da?" and then resets to the start screen in German.

## Visual system

The system combines the two references: the **meinluks** app (blue line icons, white rounded tiles, blue gradient wave) and **Dantora** (pale cool canvas, large light display type, eyebrow labels, navy pill buttons with a round arrow, stippled organic imagery). All tokens are in `css/styles.css` under `:root`.

- **Colour:** canvas `#EDF1F5`, surface `#FFFFFF`, ink `#0F1B2A` / `#46566A`, brand blue `#1F6FB8` (icons and accents), navy `#1C4A73` (primary actions and the help button), red `#D7263D` reserved for emergency and "you are here".
- **Type:** Figtree. Display text is weight 300 with tight tracking; labels are 600 uppercase eyebrows; UI text is 400–600. The root size scales with the screen (about 20 px on a 1080 × 1920 portrait kiosk) and can be enlarged with the **Tт** button.
- **Spacing:** 8-pt rhythm (`--s1` … `--s8`) and a 16–56 px gutter.
- **Shape:** 1.1–2.2 rem radii, pill buttons, soft two-layer shadows, and touch targets of at least 4 rem.
- **Composition:** one primary action per area, with the help button always last and always in the same place. Portrait (kiosk) and landscape layouts are tuned separately, and the pages also work on a phone.

## Running as a kiosk

```bash
chromium --kiosk --kiosk-printing --noerrdialogs --disable-pinch \
  --autoplay-policy=no-user-gesture-required "file:///opt/luks-terminal/index.html"
```

- `--kiosk-printing` sends the ticket to the default printer without a dialog. The print stylesheet targets an 80 mm thermal printer.
- **QR scanner:** any USB/serial scanner in keyboard mode works as long as it sends Enter after the code. Accepted payloads:
  `{"d":"eye","t":"14:30","n":"M. Muster"}` · `LUKS|eye|14:30|M. Muster` · `https://…?dept=eye&time=14:30`.
  `d` is an `id` from `DIRECTORY` in `js/data.js`. If the browser supports `BarcodeDetector`, tapping the QR icon also scans with the camera.
- **Demo:** open `index.html?demo=1` to get a "QR-Scan simulieren" button.
- **Fonts:** Figtree is loaded from Google Fonts, and system fonts are used when offline. For a fully offline terminal, self-host the font files.

## Configuration: `js/data.js`

- `CONFIG.terminalPos`: where this terminal stands on the area plan (2000 × 777 coordinates). The default is entrance A, Haus 31.
- `CONFIG.help.videoUrl`: link to the information desk's video room, shown in an iframe. While empty, a demo screen appears.
- `CONFIG.help.notifyUrl`: optional endpoint that receives a POST (`{terminal, mode, lang}`) when someone presses Help.
- `CONFIG.help.phoneNumber`, `volunteerEtaMin`, `ticketPrefix`, `idleSeconds`.
- `CONFIG.showVerifyHints`: shows "Angabe prüfen" on unconfirmed data. **Set it to `false` before go-live.**

### Data to confirm before go-live

These items come from the official area plan and are treated as reliable: building numbers, grid squares, emergency entrances A–E, central information, the pharmacy, Feingut / Azzurro / Vitamins / XUND Bistro, parking pay machines, bus stops and the chapel.

Everything marked `verify: true` is a **placeholder position** and must be confirmed:
- toilets, accessible toilets, baby changing, kiosk, cash machine, patient cash desk and lockers (not shown on the plan)
- the Kafi location; the Foodtruck has no fixed location yet
- departments assumed to be in Haus 31 (radiology, lab, cardiology, …) and their floors
- opening hours (`hours`) for the restaurants (empty for now)
- doctors: only one sample entry exists so far (shown only while `showVerifyHints` is on)

The Romansh, Albanian and Turkish translations should be reviewed by native speakers.

## Files

```
index.html              entry point
css/styles.css          visual system and all components
js/i18n.js              UI strings (de, fr, it, rm, en, pt, sq, es, tr)
js/data.js              config, buildings, places, restaurants, search directory
js/app.js               router, pages, overlays, search, idle reset
js/graphics.js          inline SVG icons and flags
js/particles.js         stippled background on the start screen
js/vendor/qrcode.js     QR code generator (MIT, Kazuhiko Arase)
assets/arealplan-luzern.jpg   area plan Standort Luzern (Arealplan V20)
```

Screenshots (1080 × 1920 portrait unless noted) are in `docs/screenshots/`.
