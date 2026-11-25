# MMC:Rebooted

**Games, Unblocked, Forever.**

One offline dashboard with 79 core games, 18 Minecraft clients, and 270+ more games in optional packs. No wifi, no server, no install.
It runs straight from the files on your computer (`file://`), so it works on a Chromebook or Windows PC with the internet off.

## How to use

**Easiest:** grab the newest **Reboot zip** from [Releases](../../releases), plus any packs you want, extract them all into the same folder, and open **`Run Me.html`**.
All the game files live in the `files` folder next to it, and `tips.js` holds the tips shown on Home (add your own).
GitHub limits each release download to 2GB, so big collections (Extra Games 1 to 3, FNF, PvZ2, Bonus) are separate packs that show up in the Games tab once extracted.

Or from this repo: download it as a zip (green **Code** button, then **Download ZIP**), extract it, and open **`MMC-Rebooted.html`**.
Keep the folders next to the HTML file, the dashboard loads games from them.

## Tabs

**Home**
- Playtime stats: total time, today, this week, day streak, games tried, longest session.
- Most Played pie chart with your top 5 games (hover a slice or a row to see it, click to play).
- Pinned box. Hover any game and hit the pin.
- Jump Back In: your most recent games.
- All Games: search (press `/`) and filter by type.

**Minecraft**
The Ampler Launcher. Pick an edition, hit Play. Every client is an offline build.
**Precision Client** (1.8.8, working multiplayer) is the default. Also: Minecraft 1.8.8, 1.5.2, Shadow Client, Resent Client, EaglerForge, Astra Client, plus controller and two mobile UIs.
Multiplayer servers need internet, everything else runs offline.
Minecraft playtime counts in your stats too.

**Settings**
- 13 themes: Neon, Hacker, White, Vaporwave, Amber CRT, Deep Sea, Inferno, Sakura, Handheld, Galaxy, Bubblegum, Frost, Cyber.
  Some have animated backgrounds (matrix rain, bubbles, embers, petals, snow, stars). They pause while you play.
- Effects on or off (turn off on slow computers)
- Open games: on this page, new tab, about:blank tab, replace this tab, or raw link
- Popout bar position for the new tab player
- Disguise: custom tab name and icon, or a preset
- Reset playtime, unpin all

Everything is saved in your browser's local storage, on your computer only.

## For coders

Browsers block `fetch` and XHR for local files opened with `file://`, so a normal web game cannot load its data offline.
Gams gets around this by embedding each game's data inside JavaScript files as **data URLs**. The page loads those files with plain `<script>` tags (which are allowed on `file://`), then turns the data URLs into **blob URLs**. Blob URLs are created inside the page, so the game can fetch them. Flash games run through the **Ruffle** emulator the same way.

MMC:Rebooted keeps that layout untouched in `gams/` and adds:

- `mmc/` the dashboard: `app.js` (tabs, stats, player), `common.js` (storage, playtime tracker, pixel icons, disguise, theme list), `games.js` (game list), `themes.css` (all themes as CSS variables), `fx.js` (animated theme backgrounds on one canvas), `play.html` (new tab player), `fonts.css` (pixel fonts embedded as data URLs).
- `games/` games added in v2 (Brotato, Crazy Cattle 3D, Jelly Mario, 3Dash), packed the same way:
  - `games/mmcsite.js` + `tools/pack_site.py` (v2.3) pack a whole game folder into base64 part scripts that load on demand, and answer the game's `fetch()`, XHR, image, audio and worker requests from them. Used for the Bonus Pack, FNF and PvZ2.
  - `games/mmcpack.js` loads big files from base64 `part` scripts, turns them back into blobs, and answers the game's `fetch()` calls with them. Audio worklets get data URLs, since worklets cannot load blob URLs from a local file.
  - Crazy Cattle 3D's original export needs threads (SharedArrayBuffer), which local files can never use, so its game data runs on Godot's official 4.4.1 single-thread web engine instead.
  - 3Dash is a Unity build whose loader unpacks its own brotli files, so they are handed over as blob URLs like the Gams Unity games.
  - Jelly Mario reads levels from PNG pixels and fetches its sounds, so every PNG and MP3 is embedded as a data URL in `assets.js`.
- `minecraft/` the Ampler Launcher, pointed at the single-file offline Eaglercraft builds (their assets are already embedded as data URLs).
  - `mc/eaglerforge/offline.html` + `assets.js`: EaglerForge had no offline build, so its `assets.epk` is embedded as a data URL and loaded with a script tag.
  - `mc/1.8.8/...Offline_en_US.html` accepts `?userscript=` so the mobile and controller scripts work offline.
  - `mc/precision/`: Precision Client was one 151MB file, over GitHub's 100MB limit. Its embedded data is split into four `assets-*.js` parts loaded with script tags and joined back in the page.
- `packs/` optional packs. Each pack zip adds `packs/<id>.js` (its game list) and `packs/<id>/` (its files). `release/packs/*.json` say how the release workflow builds the Extra Games (from Google Drive), FNF and PvZ2 (from pinned GitHub commits) packs with `tools/build_pack.py`.
- The Minecraft tab talks to the dashboard with `postMessage`, so launches open in your chosen mode and get timed.

Playtime is counted once per second while a game is open (and the tab is visible), saved every 5 seconds.

## Credits

- Games: [Gams](https://github.com/Gams-Offline/Gams) by mountain658
- Minecraft launcher: [Ampler Launcher](https://github.com/gtrdhf/AmplerLauncher) by irv77
- Eaglercraft by lax1dude, plus the client authors (Precision, Shadow, Resent, EaglerForge, Astra)
- Brotato by Blobfish, Crazy Cattle 3D by Anna Mayberry, Jelly Mario by schteppe, 3Dash (Yandex Games GeometryDash3d)
- Extra Games packs from the offline game folder supplied by the owner; covers from [gn-math/covers](https://github.com/gn-math/covers) where available, title-screen captures otherwise
- Godot Engine (MIT) for the Brotato and Crazy Cattle 3D web engines
- Flash: [Ruffle](https://ruffle.rs)
- Fonts: Press Start 2P and VT323, SIL Open Font License (see `mmc/FONT-LICENSES.txt`)
