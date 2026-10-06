// The VOICE of every screen: says each call on the Android box (q_speaker). Shared, not edited per screen (loaded as
// ../js/speaker.js, before the screen's display.js) — the sentence itself comes from each folder's get_name.php.
// Gives display.js: announce(call) — the one thing a screen needs to say a call — plus log(msg), counterNo(n),
// hasBridge (false in a plain browser: no voice)
//
// For devs: these are plain <script> globals (no modules/bundler — old Android TV-box WebViews must run this as is),
// so display.js must not declare another `log`, `counterNo`, `render`, `speak`, `announce` or `hasBridge`.
// The bridge contract with q_speaker (q_speaker/lib/queue_page.dart) is only these two calls:
//   page -> app   TTS.postMessage(text)       app speaks text with Android TTS (queued, one after another)
//   app -> page   window.ttsDone(text)        that text has finished; the page may show the next call
// Change either side only together with the other.

const log = msg => console.log('[q_html]', msg);

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

// Say one call; resolves when it has been said. call = {q, n, label, call_text, pname, fname, lname, name}:
// call_text and the name parts as get_name.php gave them (none if PHP was unreachable), label = the word before the
// counter number ("ช่องบริการ"). Without a call_text it still says the number and counter.
function announce(call) {
  const template = call.call_text || `[หมายเลข {q}] [, ${call.label || 'ช่องที่'} {n}]`;
  return speak(render(template, call));
}
