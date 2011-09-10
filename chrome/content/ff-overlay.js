surfcontrol.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ surfcontrol.showFirefoxContextMenu(e); }, false);
};

surfcontrol.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-surfcontrol").hidden = gContextMenu.onImage;
};

window.addEventListener("load", function () { surfcontrol.onFirefoxLoad(); }, false);