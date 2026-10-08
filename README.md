# LUKS Digitales Informationszentrum

Touch information terminal (`index.html`), companion website (`web/`) and the internal appointment overview **LUKS Terminradar** (`termine/`) for the **Luzerner Kantonsspital**.
Plain HTML/CSS/JS with no build step and no framework. Open `index.html` in a browser, or run it in Chrome kiosk mode.

## Website (`web/`)

`web/index.html` is a scrolling website version, separate from the kiosk, styled after the Dantora reference video. It reuses the kiosk's data, translations, icons and area plan.

- **Loader:** a teal panel with a spinning logo ring and a percentage counter, which wipes up to reveal the page. It is shown once per visit.
- **Hero:** a stippled 3D DNA helix (up to 34,000 dots, perspective and depth shading) that turns with the mouse and the scroll position, then fades out.
- **Motion:** smooth scrolling (Lenis). Headlines come into focus word by word (blur to sharp). The six service cards (01–06) sit in a row that is pinned and slides sideways as you scroll, with a parallax visual inside each card. Check-in steps draw a progress line, and the numbers count up.
- **Map:** the area plan with category filters. Selecting a place animates a zoom to it, draws the route from the main entrance and shows an info card. On phones the map scrolls sideways.
- **Restaurants:** each restaurant has a QR code for its luks.ch menu page. Search uses the kiosk's typo-tolerant matching.
- **Help section:** a navy panel with an animated constellation background and the phone number.
- **Languages:** DE, FR, IT, RM and EN (`?lang=fr`). The browser language is used by default.
- **Reduced motion:** with "reduce motion" turned on, smooth scroll, pinning and animations are switched off, and all content shows immediately.

GSAP 3.15 (with ScrollTrigger) and Lenis 1.3 are bundled in `web/vendor/`, so the page needs no CDN. GSAP uses its own free "Standard no-charge" license; Lenis is MIT. A screen recording is at `docs/web-demo.mp4`.

## Terminradar (`termine/`)

`termine/index.html` is a working prototype of the internal appointment overview described in the two project documents *Konzept: Interne Terminübersicht LUKS* and *Anforderungen des Spitalpersonals* (A01–A17). It is for staff only: Disposition, MPA, reception, doctors, nursing and management. The layout follows Outlook's calendar (blue top bar, icon rail, ribbon with Startseite / Ansicht / Hilfe, mini calendar and calendar list on the left); colours, type and buttons come from the LUKS website.

All data is fictitious and generated for the current day, so the demo always shows a running clinic. Outside office hours a **demo clock** jumps to 10:20 on the next weekday (switch it off under Einstellungen). Changes are stored in the browser (`localStorage`); **Hilfe → Demo-Daten zurücksetzen** starts over.

| Module | What it does | Requirements |
|---|---|---|
| Kalender | Day, work week, week, month and "by resource" views. Drag to move, drag the bottom edge to change the duration, drag on empty space to book. Conflict check, undo, "in LUKiS übernommen" write-back. | A01, A13, A14 |
| Tagesliste | All appointments of the day with status, delay light, waiting time and a one-click "next status" button. Delay cards per consultation with an adjustable threshold and "SMS an nächste". Printable. | A01, A02, A06, A17 |
| Freie Slots | Search by clinic, type, duration, doctor, site, period and time of day; the next match is on top. Urgent search includes reserve slots. **Kombitermin** plans 2–4 stations on one day in a fixed order with a minimum gap. | A03, A04, A07 |
| Warteliste | Freed slots (cancellations, released reserves) with candidates sorted by urgency and waiting time. "Angebot per SMS/MeinLUKS" sends an offer; the simulated reply books the slot automatically. | A05, A07 |
| Aufgaben | Document check for the next 3 working days, 48-hour reminders with confirmed / unconfirmed / cancelled, phone confirmation and double booking. | A08, A09 |
| Kennzahlen | Utilisation, waiting time to appointment, waiting time on site, no-show rate and refilled slots per clinic and week, with targets from the concept. Excel export (`.xlsx`, no personal data). | A10 |
| Wartezone | Wall screen for waiting areas with appointment numbers only, current delay and expected times. Full-screen mode. | A12 |
| Protokoll | Audit log of every access and change. | A12 |

- **Roles (A11):** switch in the user menu (top right): Disposition, MPA Kardiologie, Empfang, Ärztin, Pflege (read-only), Abteilungsleitung (anonymised). Clinics outside a role's scope show only "Belegt".
- **Privacy (A12):** *Ansicht → Datenschutz-Ansicht* shows initials and appointment numbers; the workstation locks after 5 minutes without input.
- **Live (A02):** every change is shared with other open windows of the Terminradar at once (BroadcastChannel), e.g. reception and the wall screen.
- **Notifications (A16):** "Wichtig" (delay, cancellation) is separated from "Hinweise"; each kind can be switched off per role. A click opens the appointment.
- **Tablet and phone (A15):** below 760 px the module bar moves to the bottom and dialogs open as sheets. Light and dark theme.
- **Keys:** `N` new appointment, `T` today, `←/→` navigate, `1–5` views, `/` search, `?` help.
- Online (once the Pages branch includes it): https://makemecodeclaude.github.io/luks/termine/

```
termine/index.html        app shell
termine/css/termine.css   visual system (tokens, light/dark, print, phone)
termine/js/util.js        dates, icons, helpers
termine/js/data.js        clinics, resources, roles, demo data generator
termine/js/store.js       state, localStorage, live sync, audit log, notifications
termine/js/logic.js       free slots, combined appointments, delay, waiting list, KPIs
termine/js/calendar.js    calendar views, drag and drop, mini calendar
termine/js/dialogs.js     appointment panel, editor, gap filler, reminders
termine/js/pages.js       module pages
termine/js/xlsx.js        Excel export without dependencies
termine/js/app.js         top bar, ribbon, sidebar, routing, roles, lock, search
```

## Online (GitHub Pages)

The repo is published as a static site, with no build step:

- Info terminal: https://makemecodeclaude.github.io/luks/
- Website: https://makemecodeclaude.github.io/luks/web/
- Terminradar: https://makemecodeclaude.github.io/luks/termine/

To set it up once: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then choose branch `claude/luks-digital-info-terminal-0n2ejk` and folder `/ (root)`. The `.nojekyll` file makes GitHub serve the files as they are.

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
