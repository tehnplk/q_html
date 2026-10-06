// Logic of this department's screen (index.html next to it). Each q_html/<dep>/ folder has its own copy of
// display.js and get_name.php; only ../jquery.min.js and ../socket.io.min.js are shared. A TV display: nothing to
// click, calls come only from q_signal. Diagnostics go to the console, not the screen.
// The page provides, before loading this file:
//   <body data-dep="op">   the department code = q_signal room / channel name
//   ../jquery.min.js ../socket.io.min.js (Socket.IO client v4.8.4, same as q_signal's server)
// The sentence that is spoken (call_text) comes from get_name.php, along with the patient's name
//   #title #online #q #fname #counter #status   the elements it fills
//   #waiting #called                            the waiting (.load from waiting.php) and already-called lists
//   #big.flash                                  a CSS animation, replayed on every call
// Optional URL setting: ?signal=http://host:19009 (default: this page's host, port 19009)

const DEP = $('body').data('dep');
const SIGNAL = new URLSearchParams(location.search).get('signal') || `http://${location.hostname}:19009`;
const log = msg => console.log('[q_html]', msg);

$('#title').text('จอเรียกคิว ' + DEP);

// "3", 3 or "ช่อง 3" (as q_caller sends it) -> "3"
const counterNo = n => (n == null ? '' : String(n).match(/\d+/)?.[0] ?? '');

// Same rules as q_screen's render (app/speak-core.ts). call = {q, n, pname, fname, lname, name}
function render(template, call) {
  const values = {
    q: `${call.q[0]}, ${call.q.slice(1).split('').join(' ')}`, // a pause after the letter, then digits one by one
    n: counterNo(call.n),
    name: call.name ?? '',
    pname: call.pname ?? '',
    fname: call.fname ?? '',
    lname: call.lname ?? '',
  };
  const keys = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  return template
    .replace(/\[([^\]]*)\]/g, (_, part) => (keys(part).every(k => values[k]) ? part : ''))
    .replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

// q_speaker (Android app) injects a JS channel named TTS: TTS.postMessage(text) speaks with the device TTS,
// one sentence after another, and calls window.ttsDone(text) when each is finished.
// A plain browser has no TTS object and stays silent.
const hasBridge = typeof window.TTS !== 'undefined' && typeof window.TTS.postMessage === 'function';
if (!hasBridge) $('#status').text('ไม่ได้เปิดในแอป q_speaker — ไม่มีเสียง');

// Resolves once q_speaker reports this text spoken (window.ttsDone), so the next call waits its turn and the
// number on screen is always the one being said. After 30 s it resolves anyway (an older q_speaker, no Thai
// voice), so the queue never stalls. A plain browser has no voice: each number just stays 3 s.
function speak(text) {
  return new Promise(done => {
    if (!text) return done();
    if (!hasBridge) {
      log('(ไม่มี bridge) ' + text);
      return setTimeout(done, 3000);
    }
    const timer = setTimeout(finish, 30000);
    function finish() {
      clearTimeout(timer);
      done();
    }
    window.ttsDone = said => {
      log('พูดจบ: ' + said);
      if (said === undefined || said === text) finish(); // only this call's own end counts
    };
    TTS.postMessage(text);
    log('ส่ง: ' + text);
  });
}

// From get_name.php: call_text (the sentence to say) and the patient as it should be SPOKEN (no name fields
// for an unknown queue). If PHP is unreachable the call is still never lost — just the number and counter.
const FALLBACK_TEXT = '[หมายเลข {q}] [, ที่ช่องบริการ {n}]';
async function person(q) {
  try {
    return await $.getJSON('get_name.php', { q });
  } catch {
    log('ถาม get_name.php ไม่ได้ — ขานแค่เลขคิว');
    return { call_text: FALLBACK_TEXT };
  }
}

// Waiting list = <li> items loaded from waiting.php (every 10 s and on every call), minus the queues this screen has
// called. called = this screen's own calls, newest first, [0] being the one in the big box
const called = [];
function loadWaiting() {
  $('#waiting').load('waiting.php', (_, status) => {
    if (status === 'error') return log('ถาม waiting.php ไม่ได้');
    $('#waiting li').filter((_, li) => called.some(c => c.q === li.textContent)).remove();
  });
}
function renderCalled() {
  $('#called').empty().append(called.slice(1).map(c => $('<li>').text(c.n ? `${c.q} ช่อง ${c.n}` : c.q)));
}
loadWaiting();
setInterval(loadWaiting, 10000);

// Calls are handled strictly one after another: each is shown and spoken only after the one before it has
// been said, and a slow name lookup can't let a later call go first
let chain = Promise.resolve();
function call(q, n) {
  q = String(q).toUpperCase();
  chain = chain.then(async () => {
    const p = await person(q);
    $('#q').text(q);
    $('#fname').text(p.fname ?? ''); // public screen: first name only
    $('#counter').text(counterNo(n) ? 'ช่องบริการ ' + counterNo(n) : '');
    const again = called.findIndex(c => c.q === q); // called a second time: move it to the front
    if (again >= 0) called.splice(again, 1);
    called.unshift({ q, n: counterNo(n) });
    renderCalled();
    loadWaiting();
    // Flash the box (CSS .flash in the page) as each new call takes it; restarting the class replays it
    $('#big').removeClass('flash');
    void $('#big')[0].offsetWidth;
    $('#big').addClass('flash');
    await speak(render(p.call_text || FALLBACK_TEXT, { q, n, ...p }));
  });
}

// The Socket.IO client is a local file (../socket.io.min.js), so a screen that starts before q_signal is up keeps
// retrying until it connects
const socket = io(SIGNAL);
socket.on('connect', () => { $('#online').addClass('on'); socket.emit('join', DEP); log('ต่อ q_signal แล้ว ห้อง ' + DEP); });
socket.on('disconnect', () => { $('#online').removeClass('on'); log('q_signal หลุด'); });
// From q_caller, to this department's room: {q, name, counter}
socket.on('called', ({ q, counter }) => call(q, counter));
// GET /<dep><n>/<q> on q_signal, e.g. /op3/A001 = A001 at counter 3 (the number may be left off)
const channel = new RegExp(`^${DEP}(\\d*)$`);
socket.onAny((event, q) => {
  const m = channel.exec(event);
  if (m && typeof q === 'string') call(q, m[1]);
});
