(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector(".lang-home");
    if (!root) return;

    var buttons = root.querySelectorAll(".lang-btn");
    var panels = root.querySelectorAll(".lang-panel");
    var STORAGE_KEY = "eab-lang-home";
    var DEFAULT_LANG = "es";

    function setLang(lang) {
      var found = false;
      panels.forEach(function (panel) {
        if (panel.getAttribute("data-lang") === lang) {
          panel.hidden = false;
          found = true;
        } else {
          panel.hidden = true;
        }
      });
      if (!found) return;
      buttons.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
      });
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        /* private mode / storage disabled: ignore */
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-lang"));
      });
    });

    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      saved = null;
    }
    setLang(saved || DEFAULT_LANG);
  });
})();
