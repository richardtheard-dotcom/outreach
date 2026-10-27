// Shared UI: theme, header/footer, DOM helpers, people cards, confetti.
// Loaded in <head> so the saved theme applies before first paint.
var SPUI = (function () {
  var THEME_KEY = "sp_theme";

  function savedTheme() {
    try { return window.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function currentTheme() {
    var t = savedTheme();
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
  }

  applyTheme(currentTheme());

  // el("div", {class: "x", text: "hi"}, [child, "text"])  -- text is always inserted as text.
  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase(); }).join("").slice(0, 2);
  }

  function badge(level) {
    return el("span", { class: "badge badge-" + level.toLowerCase(), text: level });
  }

  function buildHeader(page) {
    var host = document.getElementById("site-header");
    if (!host) return;
    var active = page === "results" ? "checkin" : page;

    function link(href, label, key) {
      return el("a", {
        href: href,
        class: "nav-link" + (active === key ? " is-active" : ""),
        "aria-current": active === key ? "page" : null,
        text: label
      });
    }

    var themeBtn = el("button", { type: "button", class: "icon-btn", id: "theme-toggle" });
    function syncThemeBtn() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.textContent = dark ? "☀️" : "🌙";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      themeBtn.setAttribute("title", dark ? "Light theme" : "Dark theme");
    }
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* theme just won't persist */ }
      syncThemeBtn();
    });
    syncThemeBtn();

    var inner = el("div", { class: "container header-inner" }, [
      el("a", { href: "index.html", class: "brand" }, [
        el("span", { class: "brand-mark", "aria-hidden": "true", text: "✦" }),
        el("span", { text: "Campus Support" })
      ]),
      el("nav", { "aria-label": "Main", class: "nav" }, [
        link("index.html", "Home", "home"),
        link("checkin.html", "Check-in", "checkin"),
        link("dashboard.html", "Staff view (demo)", "dashboard")
      ]),
      themeBtn
    ]);
    host.className = "site-header";
    host.appendChild(inner);
  }

  function buildFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    host.className = "site-footer";
    host.appendChild(el("div", { class: "container" }, [
      el("p", { text: "Campus Support is a rule-based demo with no real backend. It does not use AI, and nothing you enter leaves this browser." }),
      el("p", { class: "muted", text: "In crisis or feeling unsafe? Call or text 988 (US) or talk to a trusted adult now." })
    ]));
  }

  function personCard(person, role, extra) {
    return el("article", { class: "card person-card lift" }, [
      el("div", { class: "avatar", "aria-hidden": "true", text: initials(person.name) }),
      el("h3", { text: person.name }),
      el("p", { class: "muted", text: role }),
      el("p", { class: "specialty", text: person.specialty }),
      extra || null
    ]);
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function confetti(container) {
    if (reducedMotion()) return;
    var colors = ["#2a9d8f", "#e9c46a", "#f4a261", "#8e7cc3", "#e76f51"];
    var layer = el("div", { class: "confetti", "aria-hidden": "true" });
    for (var i = 0; i < 36; i++) {
      var piece = el("i");
      piece.style.left = Math.round(Math.random() * 100) + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
      piece.style.animationDuration = (1.6 + Math.random() * 1.2).toFixed(2) + "s";
      layer.appendChild(piece);
    }
    container.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 3500);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildHeader(document.body.getAttribute("data-page"));
    buildFooter();
  });

  return {
    el: el, initials: initials, badge: badge, personCard: personCard,
    confetti: confetti, reducedMotion: reducedMotion
  };
})();
