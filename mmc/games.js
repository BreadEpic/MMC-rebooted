/* MMC:Rebooted game list.
   Gams games keep the same names, sections and file layout as Gams-Offline/Gams,
   so each one still loads its own data URL / blob URL bundle from gams/g/.
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
    { id: "mc-188", name: "Minecraft 1.8.8", img: "m-logo1.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html" },
    { id: "mc-152", name: "Minecraft 1.5.2", img: "m-logo2.png", href: "mc/1.5.2/Eaglercraft_1.5_Offline_Download.html" },
    { id: "mc-shadow", name: "Shadow Client", img: "m-logo3.png", href: "mc/shadowclient/Shadow_Client_en_US.html" },
    { id: "mc-resent", name: "Resent Client", img: "m-logo4.png", href: "mc/resentclient/index.html" },
    { id: "mc-forge", name: "EaglerForge", img: "m-logo5.png", href: "mc/eaglerforge/offline.html" },
    { id: "mc-astra", name: "Astra Client", img: "m-logo7.png", href: "mc/astraclient/EaglercraftX_1.8_Offline_en_US.html" },
    { id: "mc-controller", name: "MC Controller", img: "m-logo8.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=irv77-eaglerconsole.js" },
    { id: "mc-redmobile", name: "MC Mobile (Red)", img: "m-logo9.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=irv77-eaglercraft-mobile.js" },
    { id: "mc-dogomobile", name: "MC Mobile (Dogo)", img: "m-logo10.png", href: "mc/1.8.8/EaglercraftX_1.8_Offline_en_US.html?userscript=flameddogo99-eaglermobile.js" }
  ];

  var list = [], byId = {}, sections = [], section = null;

  GAMS.forEach(function (g) {
    if (g.title) { section = g.title; sections.push(section); return; }
    var slug = g.name.toLowerCase().replace(/\s/g, "");
    var game = {
      id: slug,
      name: g.name,
      section: section,
      img: "gams/img/" + slug + ".png",
      href: "gams/" + (g.href || ("g/" + slug + ".html")),
      raw: !!g.raw
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
      mc: true
    };
    list.push(game);
    byId[game.id] = game;
  });

  window.MMC_GAMES = { list: list, byId: byId, sections: sections };
})();
