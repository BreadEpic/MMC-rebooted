/* Points the game's image loads and fetch() calls at the embedded data URLs.
   Data URL images also keep the canvas readable, which the level loader needs. */
(function () {
  var A = window.JELLY_ASSETS || {};
  var base = location.href.replace(/[#?].*$/, "").replace(/[^\/]*$/, "");
  function find(u) {
    u = String(u);
    if (u.indexOf("data:") === 0 || u.indexOf("blob:") === 0) return null;
    var abs;
    try { abs = new URL(u, base).href; } catch (e) { abs = u; }
    var rel = abs.indexOf(base) === 0 ? abs.slice(base.length) : u;
    rel = decodeURIComponent(rel.split("?")[0].split("#")[0]).replace(/^\.\//, "");
    return A[rel] || null;
  }
  var desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true, enumerable: desc.enumerable,
    get: function () { return desc.get.call(this); },
    set: function (v) { desc.set.call(this, find(v) || v); }
  });
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var hit = find(typeof input === "string" ? input : (input && input.url) || "");
    return realFetch(hit || input, hit ? undefined : init);
  };
})();
