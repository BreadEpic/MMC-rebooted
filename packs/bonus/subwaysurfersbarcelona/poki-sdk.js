/* MMC offline stub for the Poki SDK: the real one only does ads and tracking, which need
   internet. Every call succeeds right away (no ads, rewarded ads return false) so the game starts. */
(function () {
  var base = {
    init: function () { return Promise.resolve(); },
    commercialBreak: function () { return Promise.resolve(); },
    rewardedBreak: function () { return Promise.resolve(false); },
    getURLParam: function () { return null; },
    isAdBlocked: function () { return false; },
    shareableURL: function () { return Promise.reject(new Error("offline")); }
  };
  window.PokiSDK = new Proxy(base, {
    get: function (t, k) { return k in t ? t[k] : function () { return Promise.resolve(); }; }
  });
})();
