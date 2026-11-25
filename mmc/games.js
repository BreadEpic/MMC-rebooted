/* MMC:Rebooted game list.
   Gams games keep the same names, sections and file layout as Gams-Offline/Gams,
   so each one still loads its own data URL / blob URL bundle from gams/g/.
   Entries with src/thumb live in games/ (added in v2, packed the same way by games/mmcpack.js).
   Minecraft clients come from gtrdhf/AmplerLauncher (offline single-file builds). */
(function () {
  var GAMS = [
    { title: "Basic" },
    { name: "Stickman Hook" },
    { name: "Drive Mad", href: "g/g/drivemad/drivemad.html" },
    { name: "2048" },
    { name: "Cookie Clicker", href: "g/g/cookie/index.html" },
    { name: "Cube Field", href: "g/g/cubefield/index.html" },
    { name: "Spacebar Clicker" },
    { name: "Offline Paradise" },
    { name: "Sand Game" },
    { name: "Agario Lite" },
    { name: "Evil Glitch" },
    { name: "Its Raining Boxes" },
    { name: "T Rex" },
    { name: "Stack" },
    { name: "Rolling Forests" },
    { name: "Radius Raid" },
    { name: "Mountain Maze" },
    { name: "Fluid Simulator" },
    { name: "Edge Not Found" },
    { name: "Ninja vs EVILCORP" },
    { name: "Geometry Dash" },
    { name: "Wordle" },
    { name: "Paper IO 2" },
    { name: "Paper.io 3D", src: "games/paperio3d/index.html", thumb: "games/paperio3d/thumb.jpg", isNew: true, online: true },
    { name: "Jelly Mario", src: "games/jellymario/index.html", thumb: "games/jellymario/thumb.png", isNew: true },

    { title: "Unity" },
    { name: "Slope" },
    { name: "Burrito Bison", href: "g/g/burritobison/burritobison.html" },
    { name: "Tube Jumpers" },
    { name: "Hole IO" },
    { name: "Madalin Stunt Cars", href: "g/g/madalinstuntcars/madalinstuntcars.html" },
    { name: "Glass City", href: "g/g/glasscity/glasscity.html" },
    { name: "Tunnel Rush", href: "g/g/tunnelrush/tunnelrush.html" },
    { name: "Tanuki Sunset", href: "g/g/tanukisunset/tanukisunset.html" },
    { name: "A Dance of Fire and Ice", href: "g/g/fireice/index.html" },
    { name: "Game Inside a Game", href: "g/g/gameinsideagame/index.html" },
    { name: "Cell Machine", href: "g/g/cellmachine/index.html" },
    { name: "Slope 2", href: "g/g/slope2/index.html" },
    { name: "Ai Creatures", href: "g/g/aicreatures/index.html" },
    { name: "Grey Box Testing", href: "g/g/greybox/index.html" },
    { name: "3Dash", src: "games/3dash/index.html", thumb: "games/3dash/thumb.png", isNew: true },

    { title: "Godot" },
    { name: "Brotato", src: "games/brotato/index.html", thumb: "games/brotato/thumb.png", isNew: true },
    { name: "Crazy Cattle 3D", src: "games/crazycattle3d/index.html", thumb: "games/crazycattle3d/thumb.png", isNew: true },

    { title: "Retro" },
    { name: "Super Mario 64" },
    { name: "Celeste" },
    { name: "Just One Boss" },
    { name: "Super Mario RPG" },

    { title: "Henry Stickmin" },
    { name: "Breaking The Bank" },
    { name: "Escaping The Prison" },
    { name: "Stealing The Diamond" },
    { name: "Infiltrating The Airship" },
    { name: "Fleeing The Complex" },

    { title: "Flash" },
    { name: "Bloxorz" },
    { name: "Tetris" },
    { name: "Flood Runner 4" },
    { name: "Raft Wars" },
    { name: "Raft Wars 2" },
    { name: "Worlds Hardest Game" },
    { name: "The Impossible Quiz" },
    { name: "Learn To Fly Idle" },
    { name: "Learn To Fly 1" },
    { name: "Learn To Fly 2" },
    { name: "Learn To Fly 3" },
    { name: "Bloons Tower Defense 1" },
    { name: "Bloons Tower Defense 2" },
    { name: "Bloons Tower Defense 5" },
    { name: "Cat Ninja" },
    { name: "Pacman" },
    { name: "1 on 1 Soccer" },
    { name: "QWOP" },
    { name: "Use Boxmen" },
    { name: "40x Escape" },
    { name: "Stickman Life" },
    { name: "Duck Life 1" },
    { name: "Duck Life 2" },
    { name: "Duck Life 3" },
    { name: "Duck Life 4" },
    { name: "Duck Life 5" },

    { title: "Tools" },
    { name: "Ruffle Flash Player", href: "g/g/Ruffle/Ruffle.html" },
    { name: "Code Editor", raw: true },
    { name: "Web Retro" }
  ];

  var MC = [
    { id: "mc-precision", name: "Precision Client", img: "m-logo11.png", href: "mc/precision/index.html", pixel: true },
    { id: "mc-188", name: "Minecraft 1.8.8", img: "m-logo1.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html" },
    { id: "mc-152", name: "Minecraft 1.5.2", img: "m-logo2.png", href: "mc/1.5.2/Eaglercraft_1.5_Offline_Download.html" },
    { id: "mc-shadow", name: "Shadow Client", img: "m-logo3.png", href: "mc/shadowclient/Shadow_Client_en_US.html" },
    { id: "mc-resent", name: "Resent Client", img: "m-logo4.png", href: "mc/resentclient/index.html" },
    { id: "mc-forge", name: "EaglerForge", img: "m-logo5.png", href: "mc/eaglerforge/offline.html" },
    { id: "mc-astra", name: "Astra Client", img: "m-logo7.png", href: "mc/astraclient/EaglercraftX_1.8_Offline_en_US.html" },
    { id: "mc-controller", name: "MC Controller", img: "m-logo8.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=irv77-eaglerconsole.js" },
    { id: "mc-redmobile", name: "MC Mobile (Red)", img: "m-logo9.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=irv77-eaglercraft-mobile.js" },
    { id: "mc-dogomobile", name: "MC Mobile (Dogo)", img: "m-logo10.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=flameddogo99-eaglermobile.js" },
    { id: "mc-modpack", name: "Insanely huge modpack", img: "m-logo14.png", href: "mc/modpack/index.html" },
    { id: "mc-1206", name: "Minecraft 1.20.6", img: "m-logo12.png", href: "mc/1.20.6/index.html" },
    { id: "mc-1165", name: "Minecraft 1.16.5", img: "m-logo13.png", href: "mc/1.16.5/index.html" },
    { id: "mc-1122", name: "Minecraft 1.12.2", img: "m-logo15.png", href: "mc/1.12.2/index.html" },
    { id: "mc-beta13", name: "Minecraft Beta 1.3", img: "m-logo16.png", href: "mc/beta1.3/index.html", pixel: true },
    { id: "mc-alpha126", name: "Minecraft Alpha 1.2.6", img: "m-logo17.png", href: "mc/alpha1.2.6/index.html", pixel: true },
    { id: "mc-indev", name: "Minecraft Indev", img: "m-logo18.png", href: "mc/indev/index.html", pixel: true },
    { id: "mc-paper", name: "Paper Minecraft", img: "m-logo19.png", href: "mc/paperminecraft/index.html", pixel: true }
  ];

  var list = [], byId = {}, sections = [], section = null;

  GAMS.forEach(function (g) {
    if (g.title) { section = g.title; sections.push(section); return; }
    var slug = g.name.toLowerCase().replace(/\s/g, "");
    var game = {
      id: slug,
      name: g.name,
      section: section,
      img: g.thumb || ("gams/img/" + slug + ".png"),
      href: g.src || ("gams/" + (g.href || ("g/" + slug + ".html"))),
      raw: !!g.raw,
      isNew: !!g.isNew,
      online: !!g.online
    };
    list.push(game);
    byId[game.id] = game;
  });

  sections.push("Minecraft");
  MC.forEach(function (m) {
    var game = {
      id: m.id,
      name: m.name,
      section: "Minecraft",
      img: "minecraft/images/" + m.img,
      href: "minecraft/" + m.href,
      mc: true,
      pixel: !!m.pixel
    };
    list.push(game);
    byId[game.id] = game;
  });

  // Optional packs (packs/<id>.js, from the pack zips) add their games here.
  // New sections go before Tools and Minecraft so those stay at the end.
  function add(g, packName) {
    if (!g || !g.id || byId[g.id]) return null;
    var game = {
      id: g.id, name: g.name, section: g.section || "More Games", img: g.thumb || "mmc/no-cover.png",
      href: g.src, isNew: !!g.isNew, online: !!g.online, pack: packName || ""
    };
    if (sections.indexOf(game.section) === -1) {
      var at = sections.indexOf("Tools");
      if (at === -1) at = sections.length;
      sections.splice(at, 0, game.section);
    }
    list.push(game);
    byId[game.id] = game;
    return game;
  }

  window.MMC_GAMES = { list: list, byId: byId, sections: sections, add: add };
})();
