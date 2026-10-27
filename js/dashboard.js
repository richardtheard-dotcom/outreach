// Staff dashboard (demo). All student-supplied text is inserted with textContent.
(function () {
  var el = SPUI.el;
  var columns = [
    { key: "id", label: "Student #", num: true },
    { key: "email", label: "Email" },
    { key: "risk", label: "Risk", order: { High: 3, Medium: 2, Low: 1 } },
    { key: "helpType", label: "Help type" },
    { key: "tutor", label: "Tutor" },
    { key: "counselor", label: "Counselor" },
    { key: "appointment", label: "Appointment" },
    { key: "status", label: "Status" }
  ];
  var filter = "All";
  var query = "";
  var sortKey = "id";
  var sortDir = 1;

  var headRow = document.getElementById("head-row");
  var rowsHost = document.getElementById("rows");
  var emptyMsg = document.getElementById("empty");

  columns.forEach(function (c) {
    var btn = el("button", { type: "button", "data-key": c.key }, [el("span", { text: c.label }), el("span", { "aria-hidden": "true", class: "arrow" })]);
    btn.addEventListener("click", function () {
      if (sortKey === c.key) sortDir = -sortDir; else { sortKey = c.key; sortDir = 1; }
      render();
    });
    headRow.appendChild(el("th", { scope: "col", "data-key": c.key }, [btn]));
  });

  var chipHost = document.getElementById("chips");
  ["All", "High", "Medium", "Low"].forEach(function (level) {
    var chip = el("button", { type: "button", class: "chip", "aria-pressed": level === "All" ? "true" : "false", text: level });
    chip.addEventListener("click", function () {
      filter = level;
      Array.prototype.forEach.call(chipHost.children, function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      render();
    });
    chipHost.appendChild(chip);
  });

  document.getElementById("search").addEventListener("input", function (e) {
    query = e.target.value.trim().toLowerCase();
    render();
  });

  document.getElementById("clear-btn").addEventListener("click", function () {
    if (!window.confirm("Clear all demo check-ins and reset counselor workload?")) return;
    SPStore.clear();
    render();
  });

  function tile(num, label) {
    return el("div", { class: "card tile" }, [el("span", { class: "num", text: String(num) }), el("span", { class: "lbl", text: label })]);
  }

  function compare(a, b) {
    var col = columns.filter(function (c) { return c.key === sortKey; })[0];
    var x = a[sortKey], y = b[sortKey];
    if (col.order) { x = col.order[x] || 0; y = col.order[y] || 0; }
    if (typeof x === "number" && typeof y === "number") return (x - y) * sortDir;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * sortDir;
  }

  function render() {
    loadState();
    var all = students;
    var count = { High: 0, Medium: 0, Low: 0 };
    all.forEach(function (s) { if (count[s.risk] !== undefined) count[s.risk]++; });

    var tiles = document.getElementById("tiles");
    tiles.textContent = "";
    tiles.appendChild(tile(all.length, "Total check-ins"));
    tiles.appendChild(tile(count.High, "High"));
    tiles.appendChild(tile(count.Medium, "Medium"));
    tiles.appendChild(tile(count.Low, "Low"));

    var max = Math.max.apply(null, counselors.map(function (c) { return c.workload; }).concat([1]));
    var wl = document.getElementById("workload");
    wl.textContent = "";
    counselors.forEach(function (c) {
      var fill = el("div", { class: "bar-fill" });
      fill.style.width = Math.round((c.workload / max) * 100) + "%";
      wl.appendChild(el("div", { class: "bar-row" }, [
        el("span", { text: c.name }),
        el("div", { class: "bar-track", role: "img", "aria-label": c.name + " has " + c.workload + " check-ins" }, [fill]),
        el("strong", { text: String(c.workload) })
      ]));
    });

    var shown = all.filter(function (s) {
      return (filter === "All" || s.risk === filter) && (!query || String(s.email || "").toLowerCase().indexOf(query) !== -1);
    }).sort(compare);

    Array.prototype.forEach.call(headRow.children, function (th) {
      var active = th.getAttribute("data-key") === sortKey;
      th.setAttribute("aria-sort", active ? (sortDir === 1 ? "ascending" : "descending") : "none");
      th.querySelector(".arrow").textContent = active ? (sortDir === 1 ? "▲" : "▼") : "";
    });

    rowsHost.textContent = "";
    shown.forEach(function (s) {
      var tr = el("tr");
      columns.forEach(function (c) {
        var td = el("td", { "data-label": c.label });
        if (c.key === "risk") td.appendChild(SPUI.badge(s.risk)); else td.textContent = s[c.key] === undefined ? "" : String(s[c.key]);
        tr.appendChild(td);
      });
      rowsHost.appendChild(tr);
    });

    document.getElementById("count-text").textContent = "Showing " + shown.length + " of " + all.length + " check-ins";
    emptyMsg.hidden = shown.length > 0;
    emptyMsg.textContent = all.length === 0 ? "No check-ins yet. Complete a student check-in and it will appear here." : "No check-ins match your filter.";
    document.getElementById("storage-note").hidden = SPStore.isPersistent();
  }

  window.addEventListener("storage", render);
  render();
})();
