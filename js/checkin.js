// Check-in wizard: one question per screen, answers kept in sessionStorage.
(function () {
  var el = SPUI.el;
  var ANSWERS_KEY = "sp_answers";
  var RESULT_KEY = "sp_result";

  var steps = [
    { key: "email", title: "First, what's your email?", lead: "We use it only to label your check-in in this demo.", type: "email" },
    { key: "stress", title: "How are you feeling right now?", lead: "Tap the face that fits best. There's no wrong answer.", mood: true, options: [
      { value: 1, emoji: "😫", title: "Very stressed" },
      { value: 2, emoji: "😟", title: "Stressed" },
      { value: 3, emoji: "😐", title: "Okay" },
      { value: 4, emoji: "🙂", title: "Good" },
      { value: 5, emoji: "😄", title: "Great" }
    ] },
    { key: "struggling", title: "Are you struggling in any classes?", lead: "Thanks for being honest. Just a few more.", options: [
      { value: "No", emoji: "👍", title: "No", desc: "Classes feel manageable" },
      { value: "A little", emoji: "🤔", title: "A little", desc: "Some things are tricky" },
      { value: "Yes", emoji: "😓", title: "Yes", desc: "I'm having a hard time" }
    ] },
    { key: "assignments", title: "How many assignments are you behind on?", lead: "Being behind is common, and it's fixable.", options: [
      { value: "No", emoji: "✅", title: "None", desc: "I'm caught up" },
      { value: "1-2", emoji: "📝", title: "1–2", desc: "A couple are overdue" },
      { value: "3+", emoji: "📚", title: "3 or more", desc: "I've got a pile to catch up on" }
    ] },
    { key: "helpType", title: "What kind of help would be most useful?", lead: "Thanks for sharing. One more question after this one.", options: [
      { value: "Homework help", emoji: "✏️", title: "Homework help", desc: "Work through assignments" },
      { value: "Study planning", emoji: "🗓️", title: "Study planning", desc: "Organize time and priorities" },
      { value: "Stress support", emoji: "🌿", title: "Stress support", desc: "Talk through what's overwhelming" }
    ] },
    { key: "followup", title: "Would you like someone to follow up with you?", lead: "Last one. You're almost done.", options: [
      { value: "No", emoji: "🙅", title: "No", desc: "I'm good for now" },
      { value: "Maybe", emoji: "🤷", title: "Maybe", desc: "Not sure yet" },
      { value: "Yes", emoji: "🙋", title: "Yes", desc: "Yes, please check in on me" }
    ] }
  ];

  var host = document.getElementById("step-host");
  var errorBox = document.getElementById("step-error");
  var backBtn = document.getElementById("back-btn");
  var nextBtn = document.getElementById("next-btn");
  var form = document.getElementById("wizard");
  var current = 0;
  var busy = false;

  var answers = SPStore.sessionGet(ANSWERS_KEY) || {};
  if (typeof answers.step === "number" && answers.step >= 0 && answers.step < steps.length) current = answers.step;

  function save() {
    answers.step = current;
    SPStore.sessionSet(ANSWERS_KEY, answers);
  }

  function showError(msg, input) {
    errorBox.textContent = msg;
    if (input) {
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) input.setAttribute("aria-describedby", "step-error"); else input.removeAttribute("aria-describedby");
    }
  }

  function render(direction) {
    var s = steps[current];
    errorBox.textContent = "";
    var heading = el("h1", { tabindex: "-1", id: "step-title", text: s.title });
    var body;

    if (s.type === "email") {
      body = el("div", { class: "field" }, [
        el("label", { class: "field-label", for: "email", text: "Email address" }),
        el("input", { type: "email", id: "email", name: "email", autocomplete: "email", inputmode: "email", maxlength: "254", placeholder: "you@school.edu", value: answers.email || "" })
      ]);
    } else {
      var group = el("div", { class: "options" + (s.mood ? " options-mood" : "") });
      s.options.forEach(function (o, i) {
        var id = s.key + "-" + i;
        var input = el("input", { type: "radio", name: s.key, id: id, value: String(o.value) });
        if (String(answers[s.key]) === String(o.value)) input.checked = true;
        var textBits = [el("span", { class: "option-title", text: o.title })];
        if (o.desc) textBits.push(el("span", { class: "option-desc", text: o.desc }));
        group.appendChild(el("label", { class: "option", for: id }, [
          input,
          el("span", { class: "option-body" }, [
            el("span", { class: "option-emoji", "aria-hidden": "true", text: o.emoji }),
            el("span", {}, textBits)
          ])
        ]));
      });
      body = el("fieldset", {}, [el("legend", { class: "visually-hidden", text: s.title }), group]);
    }

    var step = el("div", { class: "step " + (direction === "back" ? "slide-prev" : direction === "next" ? "slide-next" : "") }, [
      heading,
      el("p", { class: "lead", text: s.lead }),
      body
    ]);
    host.textContent = "";
    host.appendChild(step);

    document.getElementById("progress-text").textContent = "Question " + (current + 1) + " of " + steps.length;
    var bar = document.getElementById("progress");
    bar.setAttribute("aria-valuenow", String(current + 1));
    document.getElementById("progress-bar").style.width = Math.round(((current + 1) / steps.length) * 100) + "%";
    backBtn.hidden = current === 0;
    nextBtn.textContent = current === steps.length - 1 ? "See my matches" : "Next";
    save();
    heading.focus();
  }

  // Reads and validates the current step. Returns true when it is OK to move on.
  function captureCurrent() {
    var s = steps[current];
    if (s.type === "email") {
      var input = document.getElementById("email");
      var value = input.value.trim();
      if (!value) { showError("Please enter your email so we can save your check-in.", input); input.focus(); return false; }
      if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        showError("That doesn't look like an email yet. Try something like name@school.edu.", input);
        input.focus();
        return false;
      }
      showError("", input);
      answers.email = value;
      save();
      return true;
    }
    var checked = host.querySelector('input[name="' + s.key + '"]:checked');
    if (!checked) {
      showError(s.key === "stress" ? "Please tap a face from 1 (very stressed) to 5 (great)." : "Please choose one option to continue.");
      var first = host.querySelector('input[name="' + s.key + '"]');
      if (first) first.focus();
      return false;
    }
    answers[s.key] = s.key === "stress" ? parseInt(checked.value, 10) : checked.value;
    showError("");
    save();
    return true;
  }

  host.addEventListener("change", function (e) {
    if (e.target && e.target.type === "radio") {
      var s = steps[current];
      answers[s.key] = s.key === "stress" ? parseInt(e.target.value, 10) : e.target.value;
      errorBox.textContent = "";
      save();
    }
  });

  backBtn.addEventListener("click", function () {
    if (busy || current === 0) return;
    // Keep whatever is in the email box even when going back.
    var emailInput = document.getElementById("email");
    if (emailInput) answers.email = emailInput.value.trim();
    current--;
    render("back");
  });

  function submitAll() {
    var payload = {
      email: answers.email,
      stress: answers.stress,
      struggling: answers.struggling,
      assignments: answers.assignments,
      helpType: answers.helpType,
      followup: answers.followup
    };
    busy = true;
    nextBtn.disabled = true;
    backBtn.disabled = true;
    nextBtn.textContent = "";
    nextBtn.appendChild(el("span", { class: "spinner", "aria-hidden": "true" }));
    nextBtn.appendChild(document.createTextNode(" Finding your matches…"));
    errorBox.textContent = "";

    mockSubmitCheckIn(payload).then(function (res) {
      SPStore.sessionSet(RESULT_KEY, {
        level: res.level,
        counselor: { name: res.counselor.name, specialty: res.counselor.specialty, type: res.counselor.type },
        tutor: { name: res.tutor.name, specialty: res.tutor.specialty },
        appointment: res.appointment,
        counselorMessage: res.counselorMessage,
        reasons: res.reasons,
        helpType: payload.helpType
      });
      SPStore.sessionRemove(ANSWERS_KEY);
      window.location.href = "results.html";
    }).catch(function () {
      busy = false;
      nextBtn.disabled = false;
      backBtn.disabled = false;
      nextBtn.textContent = "See my matches";
      errorBox.textContent = "Something went wrong saving your check-in. Please try again.";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    if (!captureCurrent()) return;
    if (current < steps.length - 1) {
      current++;
      render("next");
    } else {
      submitAll();
    }
  });

  render("");
})();
