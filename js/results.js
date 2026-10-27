// Results page: short "finding" animation, then counselor + tutor cards.
(function () {
  var el = SPUI.el;
  var root = document.getElementById("results");
  var result = SPStore.sessionGet("sp_result");

  function startOver() {
    SPStore.sessionRemove("sp_result");
    SPStore.sessionRemove("sp_answers");
  }

  if (!result) {
    root.appendChild(el("div", { class: "card finding" }, [
      el("h1", { tabindex: "-1", id: "r-title", text: "No check-in yet" }),
      el("p", { class: "muted", text: "Take the short check-in and your matches will show up here." }),
      el("a", { class: "btn btn-primary", href: "checkin.html", text: "Start check-in" })
    ]));
    document.getElementById("r-title").focus();
    return;
  }

  var finding = el("div", { class: "finding" }, [
    el("div", { class: "orbit", "aria-hidden": "true" }),
    el("h1", { tabindex: "-1", id: "r-title", text: "Finding your support team…" }),
    el("p", { class: "muted", text: "Looking at your answers and checking who's available." })
  ]);
  root.appendChild(finding);
  document.getElementById("r-title").focus();

  var levelNotes = {
    Low: "Your answers suggest you're in a steady place. Support is here whenever you want it.",
    Medium: "Your answers suggest a bit of extra support could help.",
    High: "Your answers suggest you could use support soon, so we've prioritized your match."
  };

  function why(lines) {
    return el("div", { class: "why" }, [
      el("h4", { text: "Why you were matched" }),
      el("ul", {}, lines.map(function (l) { return el("li", { text: l }); }))
    ]);
  }

  function counselorWhy() {
    var c = result.counselor;
    var lines = [];
    if (result.level === "High") {
      lines.push("Your answers add up to our highest support level, so you're matched with " + c.name + ", who specializes in " + c.specialty + ".");
      result.reasons.forEach(function (r) { lines.push(r); });
    } else if (result.helpType === "Stress support") {
      lines.push("You chose Stress support → " + c.name + " specializes in " + c.specialty + ".");
    } else {
      lines.push("You chose " + result.helpType + " → " + c.name + " specializes in " + c.specialty + " and currently has the lightest workload among academic counselors.");
    }
    return why(lines);
  }

  function tutorWhy() {
    var t = result.tutor;
    return why(["You chose " + result.helpType + " → " + t.name + " specializes in " + t.specialty + "."]);
  }

  function reveal() {
    var c = result.counselor;
    var t = result.tutor;
    root.textContent = "";

    var head = el("div", { class: "reveal-head" }, [
      (function () {
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "check");
        svg.setAttribute("viewBox", "0 0 72 72");
        svg.setAttribute("aria-hidden", "true");
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "36"); circle.setAttribute("cy", "36"); circle.setAttribute("r", "34");
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M21 37 L32 48 L52 26");
        svg.appendChild(circle);
        svg.appendChild(path);
        return svg;
      })(),
      el("h1", { tabindex: "-1", id: "r-title", text: "Your support team is ready" }),
      el("p", {}, [document.createTextNode("Support level: "), SPUI.badge(result.level)]),
      el("p", { class: "muted", text: levelNotes[result.level] || "" })
    ]);

    var counselorCard = el("article", { class: "card match-card pop-in", "aria-label": "Your counselor" }, [
      el("div", { class: "avatar", "aria-hidden": "true", text: SPUI.initials(c.name) }),
      el("h2", { text: c.name }),
      el("p", { class: "specialty", text: "Counselor · " + c.specialty }),
      el("dl", {}, [
        el("dt", { text: "Appointment" }),
        el("dd", { text: result.appointment }),
        el("dt", { text: "A message from " + c.name }),
        el("dd", { class: "quote", text: "“" + result.counselorMessage + "”" })
      ]),
      counselorWhy()
    ]);

    var tutorCard = el("article", { class: "card match-card pop-in delay", "aria-label": "Your tutor" }, [
      el("div", { class: "avatar", "aria-hidden": "true", text: SPUI.initials(t.name) }),
      el("h2", { text: t.name }),
      el("p", { class: "specialty", text: "Tutor · " + t.specialty }),
      el("dl", {}, [
        el("dt", { text: "Focus area" }),
        el("dd", { text: result.helpType })
      ]),
      tutorWhy()
    ]);

    root.appendChild(head);
    root.appendChild(el("div", { class: "match-grid" }, [counselorCard, tutorCard]));

    if (result.level === "High") {
      root.appendChild(el("p", { class: "note", role: "note", text: "If you're in crisis or feel unsafe, call or text 988 (US) or talk to a trusted adult now." }));
    }

    var again = el("a", { class: "btn btn-secondary", href: "checkin.html", text: "Take another check-in" });
    again.addEventListener("click", startOver);
    root.appendChild(el("div", { class: "results-actions" }, [again]));

    document.getElementById("r-title").focus();
    SPUI.confetti(head);
  }

  setTimeout(reveal, SPUI.reducedMotion() ? 300 : 1600);
})();
