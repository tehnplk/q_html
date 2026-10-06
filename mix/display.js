// The SCREEN of this folder: shows each call from q_signal and hands it to ../js/speaker.js to be said on the Android
// box. Each screen folder has its own copy, so change it here to change this screen alone. A TV display: nothing to
// click. Diagnostics go to the console, not the screen.
// The page provides, before loading this file:
//   <section class="dep" data-dep="fin" data-counter="ช่องที่">   one per department shown on this screen
//       data-dep      = q_signal room / channel name
//       data-counter  = word before the counter number (default "ช่องที่")
//     .online .q .fname .counter .big .waiting .called   the elements it fills inside that section
//     .big.flash                                       a CSS animation, replayed on every call
//   #status                                            "no voice" notice
//   ../js/speaker.js         announce(call), log, counterNo, hasBridge   (the voice, shared)
//   ../js/signal_client.js   listen(dep, onCall, onOnline)              (q_signal, shared)
// This folder's PHP, called with relative paths:
//   get_name.php?dep=&q=   the sentence to say (call_text) + the patient's name as it should be SPOKEN
//   waiting_<dep>.php      that department's waiting list as <li> items (waiting_fin.php, waiting_rx.php)

if (!hasBridge) $('#status').text('ไม่ได้เปิดในแอป q_speaker — ไม่มีเสียง');

// Calls from every department on this screen wait in this one line: each is shown, then said, before the next
let chain = Promise.resolve();

$('.dep').each((_, section) => {
  const $s = $(section);
  const dep = $s.data('dep');
  const label = $s.data('counter') || 'ช่องที่';
  const $big = $s.find('.big');

  // get_name.php: call_text + the patient's name parts. Unreachable: {} (speaker.js then says number + counter)
  async function person(q) {
    try {
      return await $.getJSON('get_name.php', { dep, q });
    } catch {
      log(dep + ': ถาม get_name.php ไม่ได้ — ขานแค่เลขคิว');
      return {};
    }
  }

  // Waiting list = <li> items loaded from waiting_<dep>.php (every 10 s and on every call), minus the queues this
  // department has called. called = its own calls, newest first, [0] being the one in the big box (lost on reload)
  const called = [];
  function loadWaiting() {
    $s.find('.waiting').load(`waiting_${dep}.php`, (_, status) => {
      if (status === 'error') return log(dep + `: ถาม waiting_${dep}.php ไม่ได้`);
      $s.find('.waiting li').filter((_, li) => called.some(c => c.q === li.textContent)).remove();
    });
  }
  function renderCalled() {
    $s.find('.called').empty().append(called.slice(1).map(c => $('<li>').text(c.n ? `${c.q} ช่อง ${c.n}` : c.q)));
  }
  loadWaiting();
  setInterval(loadWaiting, 10000);

  function call(q, n) {
    q = String(q).toUpperCase();
    n = counterNo(n);
    chain = chain.then(async () => {
      const p = await person(q);
      $s.find('.q').text(q);
      $s.find('.fname').text(p.fname ?? ''); // public screen: first name only
      $s.find('.counter').text(n ? `${label} ${n}` : '');
      const again = called.findIndex(c => c.q === q); // called a second time: move it to the front
      if (again >= 0) called.splice(again, 1);
      called.unshift({ q, n });
      renderCalled();
      loadWaiting();
      // Flash the box (CSS .flash in the page) as each new call takes it; restarting the class replays it
      $big.removeClass('flash');
      void $big[0].offsetWidth;
      $big.addClass('flash');
      await announce({ ...p, q, n, label });
    });
  }

  listen(dep, call, online => $s.find('.online').toggleClass('on', online));
});
