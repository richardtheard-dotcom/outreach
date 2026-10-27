// Storage wrapper. localStorage holds shared demo state; sessionStorage holds the
// in-progress wizard. Every access is guarded, with in-memory / window.name fallbacks.
var SPStore = (function () {
  var KEY = "sp_state_v1";
  var memState = null;
  var persistent = true;

  function defaults() {
    return { counter: 1, slot: 9, students: [], workload: {} };
  }

  function read() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { persistent = false; }
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        var d = defaults();
        return {
          counter: Number(parsed.counter) || d.counter,
          slot: Number(parsed.slot) || d.slot,
          students: Array.isArray(parsed.students) ? parsed.students : [],
          workload: parsed.workload && typeof parsed.workload === "object" ? parsed.workload : {}
        };
      } catch (e2) { /* corrupted data: fall through to defaults */ }
    }
    return memState ? JSON.parse(JSON.stringify(memState)) : defaults();
  }

  function write(state) {
    memState = JSON.parse(JSON.stringify(state));
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { persistent = false; }
  }

  function clear() {
    memState = null;
    try { window.localStorage.removeItem(KEY); } catch (e) { persistent = false; }
  }

  function isPersistent() {
    try {
      window.localStorage.setItem("sp_probe", "1");
      window.localStorage.removeItem("sp_probe");
      return persistent;
    } catch (e) { return false; }
  }

  // Session values (wizard answers, latest result). Falls back to window.name.
  function sessionGet(key) {
    try {
      var v = window.sessionStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      try {
        var all = window.name ? JSON.parse(window.name) : {};
        return all[key] || null;
      } catch (e2) { return null; }
    }
  }

  function sessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      try {
        var all = window.name ? JSON.parse(window.name) : {};
        all[key] = value;
        window.name = JSON.stringify(all);
      } catch (e2) { /* nothing more we can do */ }
    }
  }

  function sessionRemove(key) {
    try { window.sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
    try {
      var all = window.name ? JSON.parse(window.name) : {};
      delete all[key];
      window.name = JSON.stringify(all);
    } catch (e2) { /* ignore */ }
  }

  return {
    read: read, write: write, clear: clear, isPersistent: isPersistent,
    sessionGet: sessionGet, sessionSet: sessionSet, sessionRemove: sessionRemove
  };
})();
