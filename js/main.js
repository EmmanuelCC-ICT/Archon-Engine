(function (ns) {
  function boot() {
    var renderer = ns.ui.createRenderer();
    var arena = ns.battle.createArena({
      canvas: document.getElementById("battleCanvas"),
      humanShootAudio: document.getElementById("humanShootAudio"),
      aiShootAudio: document.getElementById("aiShootAudio"),
      humanBattleStrikeAudio: document.getElementById("humanBattleStrikeAudio"),
      aiBattleStrikeAudio: document.getElementById("aiBattleStrikeAudio")
    });
    var game = ns.core.createGame({
      renderer: renderer,
      arena: arena
    });

    game.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window.ArchonEngine);
