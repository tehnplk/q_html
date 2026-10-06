// Connection to q_signal shared by every screen (loaded as ../js/signal_client.js, after ../js/socket.io.min.js and
// before the screen's display.js). Not edited per screen.
// Gives display.js: listen(dep, onCall, onOnline)
//   onCall(q, n)        a call for this department: queue q at counter n ("3", "ช่อง 3" or "" when left off)
//   onOnline(isOnline)  connected to q_signal or not
// Optional URL setting: ?signal=http://host:19009 (default: this page's host, port 19009)
//
// For devs: q_signal (../q_signal/server.js) is a pure relay with no state. What reaches a screen:
//   GET http://<host>:19009/<dep><n>/<q>   -> io.emit('<dep><n>', q) to everyone; we keep only our own dep
//   q_caller emits changed {dept, called}  -> 'called' {q, name, counter} to the room <dept> we joined
// js/socket.io.min.js must stay on the same Socket.IO major version as q_signal's server (v4).

const SIGNAL = new URLSearchParams(location.search).get('signal') || `http://${location.hostname}:19009`;

function listen(dep, onCall, onOnline) {
  // q_signal keeps a socket in one room only, so each department gets its own connection. The client is a local
  // file (js/socket.io.min.js), so a screen that starts before q_signal is up keeps retrying until it connects.
  const socket = io(SIGNAL, { forceNew: true });
  socket.on('connect', () => { onOnline(true); socket.emit('join', dep); console.log('[q_html]', 'ต่อ q_signal แล้ว ห้อง ' + dep); });
  socket.on('disconnect', () => { onOnline(false); console.log('[q_html]', dep + ': q_signal หลุด'); });
  // From q_caller, to this department's room: {q, name, counter}
  socket.on('called', ({ q, counter }) => onCall(q, counter));
  // GET /<dep><n>/<q> on q_signal, e.g. /op3/A001 = A001 at counter 3 (the number may be left off)
  const channel = new RegExp(`^${dep}(\\d*)$`);
  socket.onAny((event, q) => {
    const m = channel.exec(event);
    if (m && typeof q === 'string') onCall(q, m[1]);
  });
}
