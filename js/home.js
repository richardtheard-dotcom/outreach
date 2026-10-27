// Landing page: render counselor and tutor cards from js/data.js.
(function () {
  var cHost = document.getElementById("counselor-cards");
  var tHost = document.getElementById("tutor-cards");
  counselors.forEach(function (c) {
    cHost.appendChild(SPUI.personCard(c, "Counselor"));
  });
  tutors.forEach(function (t) {
    tHost.appendChild(SPUI.personCard(t, "Tutor"));
  });
})();
