// Matching logic. Depends on js/data.js (counselors, tutors).
// If js/store.js is loaded (SPStore), state persists in localStorage between pages.

let studentCounter = 1;
let students = [];
let appointmentTime = 9; // Start at 9:00 AM

function loadState() {
  if (typeof SPStore === "undefined") return;
  const s = SPStore.read();
  studentCounter = s.counter;
  appointmentTime = s.slot;
  students = s.students;
  counselors.forEach(c => { c.workload = s.workload[c.name] || 0; });
}

function saveState() {
  if (typeof SPStore === "undefined") return;
  const workload = {};
  counselors.forEach(c => { workload[c.name] = c.workload; });
  SPStore.write({ counter: studentCounter, slot: appointmentTime, students, workload });
}

function assignTutor(helpType) {
  // Find a tutor whose specialty matches the selected help type,
  // otherwise fall back to the first tutor.
  const match = tutors.find(t => t.specialty === helpType);
  return match || tutors[0];
}

// Mock API function simulating a backend call
function mockSubmitCheckIn(payload) {
  return new Promise(resolve => {
    // Simulate network delay
    setTimeout(() => {
      loadState();
      const { email, stress, struggling, assignments, helpType, followup } = payload;

      const level = calculateRisk(stress, struggling, assignments, followup);
      const counselor = assignCounselor(level, helpType);
      const tutor = assignTutor(helpType);
      const appointment = generateAppointment(level);

      // Update counselor workload as if the backend was tracking it
      counselor.workload++;

      let counselorMessage = "";

      if (counselor.type === "academic") {
        counselorMessage = "Let's organize your assignments into a simple 3-step success plan.";
      }
      if (counselor.type === "stress") {
        counselorMessage = "Let's take a breath together and talk through what's feeling overwhelming.";
      }
      if (counselor.type === "highrisk") {
        counselorMessage = "I'm prioritizing your case and will personally check in with you very soon.";
      }

      const studentData = {
        id: studentCounter++,
        email,
        risk: level,
        helpType,
        tutor: tutor.name,
        counselor: counselor.name,
        appointment,
        status: level === "High" ? "High Priority" : "Scheduled"
      };

      students.push(studentData);
      saveState();

      resolve({
        level,
        counselor,
        tutor,
        appointment,
        counselorMessage,
        studentData,
        reasons: riskReasons(stress, struggling, assignments, followup)
      });
    }, 400);
  });
}

function calculateRisk(stress, struggling, assignments, followup) {
  let score = 0;
  if (stress <= 2) score += 2;
  if (assignments === "3+") score += 2;
  if (struggling === "Yes") score += 2;
  if (followup === "Yes") score += 1;

  if (score >= 5) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

// Explains calculateRisk in plain words (display only; does not affect results).
function riskReasons(stress, struggling, assignments, followup) {
  const reasons = [];
  if (stress <= 2) reasons.push("You said you're feeling quite stressed (+2)");
  if (assignments === "3+") reasons.push("You're 3 or more assignments behind (+2)");
  if (struggling === "Yes") reasons.push("You're struggling in your classes (+2)");
  if (followup === "Yes") reasons.push("You'd like someone to follow up (+1)");
  return reasons;
}

function assignCounselor(level, helpType) {

  if (level === "High") {
    return counselors.find(c => c.type === "highrisk");
  }

  if (helpType === "Stress support") {
    return counselors.find(c => c.type === "stress");
  }

  // Academic counselor with lowest workload
  const academicCounselors = counselors.filter(c => c.type === "academic");
  academicCounselors.sort((a, b) => a.workload - b.workload);
  return academicCounselors[0];
}

// 9, 10, 11 are morning slots; 12 and later are afternoon (12:00 PM, 1:00 PM, ...).
function formatSlot(hour) {
  return hour + ":00 " + (hour >= 9 && hour < 12 ? "AM" : "PM");
}

function generateAppointment(level) {

  if (level === "High") {
    return "Immediate (Within 1 Hour)";
  }

  let timeString = formatSlot(appointmentTime);
  appointmentTime++;

  if (appointmentTime > 12) appointmentTime = 1;

  return timeString;
}
