// Run: node tests/logic.test.js  (loads data.js + logic.js into one classic-script context)
const fs = require("fs"), vm = require("vm"), path = require("path");
const read = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
function fresh() {
  const ctx = vm.createContext({ setTimeout });
  vm.runInContext(read("data.js") + "\n" + read("logic.js"), ctx);
  return ctx;
}
let fails = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : " got=" + JSON.stringify(got) + " want=" + JSON.stringify(want)));
}
(async () => {
  let c = fresh();
  const run = (ctx, p) => vm.runInContext("mockSubmitCheckIn(" + JSON.stringify(p) + ")", ctx);
  let r = await run(c, { email: "a@b.co", stress: 1, struggling: "Yes", assignments: "3+", followup: "Yes", helpType: "Homework help" });
  eq("case1", [r.level, r.counselor.name, r.tutor.name, r.appointment, r.studentData.status], ["High", "Dr. Patel", "Ms. Lee", "Immediate (Within 1 Hour)", "High Priority"]);
  c = fresh();
  r = await run(c, { email: "a@b.co", stress: 3, struggling: "Yes", assignments: "3+", followup: "No", helpType: "Stress support" });
  eq("case2", [r.level, r.counselor.name, r.tutor.name], ["Medium", "Mr. Thompson", "Ms. Nguyen"]);
  c = fresh();
  r = await run(c, { email: "a@b.co", stress: 5, struggling: "No", assignments: "No", followup: "No", helpType: "Study planning" });
  eq("case3", [r.level, r.counselor.name, r.tutor.name], ["Low", "Ms. Rodriguez", "Mr. Garcia"]);
  c = fresh();
  const times = [];
  for (let i = 0; i < 4; i++) times.push((await run(c, { email: "x@y.zz", stress: 5, struggling: "No", assignments: "No", followup: "No", helpType: "Homework help" })).appointment);
  eq("slots", times, ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"]);
  eq("slots continue", [vm.runInContext("generateAppointment('Low')", c), vm.runInContext("generateAppointment('Low')", c)], ["1:00 PM", "2:00 PM"]);
  eq("workload", vm.runInContext("counselors.find(c=>c.type==='academic').workload", c), 4);
  eq("tutor fallback", vm.runInContext("assignTutor('Nope').name", c), "Ms. Lee");
  eq("messages", (await run(fresh(), { email: "a", stress: 5, struggling: "No", assignments: "No", followup: "No", helpType: "Homework help" })).counselorMessage, "Let's organize your assignments into a simple 3-step success plan.");
  eq("risk thresholds", [vm.runInContext("calculateRisk(2,'No','No','No')", c), vm.runInContext("calculateRisk(2,'Yes','No','No')", c), vm.runInContext("calculateRisk(2,'Yes','3+','No')", c), vm.runInContext("calculateRisk(5,'A little','1-2','Maybe')", c)], ["Low", "Medium", "High", "Low"]);
  console.log(fails ? fails + " FAILED" : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})();
