(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var phone = innerWidth < 768;
  var lite = reduce || phone || conn.saveData || /2g/.test(conn.effectiveType || '');
  if (lite) doc.classList.add('novid');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- reveal on scroll ---------- */
  var rvs = $$('.rv');
  if (!('IntersectionObserver' in window) || reduce) rvs.forEach(function (e) { e.classList.add('in'); });
  else {
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rvs.forEach(function (e, i) { if (!e.style.getPropertyValue('--d')) { var sib = e.parentNode.querySelectorAll(':scope > .rv'); var k = Array.prototype.indexOf.call(sib, e); if (sib.length > 1 && k > 0) e.style.setProperty('--d', Math.min(k, 5) * 70 + 'ms'); } rio.observe(e); });
  }

  /* ---------- count up ---------- */
  var nio = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; nio.unobserve(e.target);
      var el = e.target, to = +el.getAttribute('data-n'), t0 = performance.now(), dur = 1500;
      if (reduce) { el.textContent = to.toLocaleString('en-US'); return; }
      (function step(now) { var p = clamp((now - t0) / dur, 0, 1), v = Math.round(to * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('en-US'); if (p < 1) requestAnimationFrame(step); })(t0);
    });
  }, { threshold: .6 }) : null;
  $$('[data-n]').forEach(function (el) { if (nio) nio.observe(el); else el.textContent = (+el.getAttribute('data-n')).toLocaleString('en-US'); });

  /* ---------- looping picture videos: only the ones on screen play ---------- */
  var vids = $$('video.loop');
  if (!lite && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!v.src) v.src = v.getAttribute('data-src'); var p = v.play(); if (p && p.then) p.then(function () { v.classList.add('on'); }, function () {}); }
        else v.pause();
      });
    }, { rootMargin: '25% 0px' });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* ---------- scroll: progress, parallax, axis line, current chapter ---------- */
  var panels = $$('.panel'), hero = $('.hero'), axis = $('.axis'), chip = $('.chip'), chipB = $('b', chip), chipS = $('span', chip);
  var visible = new Set();
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }); }, { rootMargin: '20% 0px' });
    panels.forEach(function (p) { pio.observe(p); });
  } else panels.forEach(function (p) { visible.add(p); });
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY || 0, vh = innerHeight, max = Math.max(1, doc.scrollHeight - vh);
    doc.style.setProperty('--prog', clamp(y / max, 0, 1).toFixed(4));
    if (!reduce) {
      if (hero && y < vh * 1.2) hero.style.setProperty('--hp', clamp(y / vh, 0, 1.2).toFixed(4));
      visible.forEach(function (p) { var r = p.getBoundingClientRect(); p.style.setProperty('--p', clamp((r.top + r.height / 2 - vh / 2) / (vh * .9), -1.2, 1.2).toFixed(4)); });
    }
    if (axis) { var ar = axis.getBoundingClientRect(); axis.style.setProperty('--ad', clamp((vh * .75 - ar.top) / ar.height, 0, 1).toFixed(4)); }
    var cur = null;
    for (var i = 0; i < panels.length; i++) { var r2 = panels[i].getBoundingClientRect(); if (r2.top < vh * .5 && r2.bottom > vh * .35) { cur = panels[i]; break; } }
    if (cur) { var nm = cur.getAttribute('data-name') || ''; chipB.textContent = nm.slice(0, 2); chipS.textContent = nm.slice(3); chip.classList.add('on'); } else chip.classList.remove('on');
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); frame();

  /* ---------- sound: anime voice clips and Chinese read-aloud ---------- */
  var audio = null, speaking = null, current = null;
  function stopAll() {
    if (audio) { audio.pause(); audio = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (current) { current.classList.remove('playing'); current = null; }
  }
  function playVoice(btn, src) {
    stopAll(); current = btn; btn.classList.add('playing');
    audio = new Audio(src); audio.preload = 'auto';
    var done = function () { if (current === btn) { btn.classList.remove('playing'); current = null; } };
    audio.addEventListener('ended', done); audio.addEventListener('error', done);
    var p = audio.play(); if (p && p.catch) p.catch(done);
  }
  var zhVoice = null;
  function pickVoice() { if (!('speechSynthesis' in window)) return; var vs = speechSynthesis.getVoices(); zhVoice = vs.filter(function (v) { return /^zh[-_]CN/i.test(v.lang) || /Chinese|Mandarin/i.test(v.name); })[0] || vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null; }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice); }
  function sayChinese(btn, text) {
    if (!('speechSynthesis' in window)) { btn.setAttribute('title', 'This browser cannot read Chinese aloud'); return; }
    stopAll(); current = btn; btn.classList.add('playing');
    var u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; if (zhVoice) u.voice = zhVoice; u.rate = .82; u.pitch = 1;
    var done = function () { if (current === btn) { btn.classList.remove('playing'); current = null; } };
    u.onend = done; u.onerror = done; speechSynthesis.speak(u);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v],[data-say]'); if (!b) return;
    if (b.classList.contains('playing')) { stopAll(); return; }
    if (b.hasAttribute('data-v')) playVoice(b, b.getAttribute('data-v')); else sayChinese(b, b.getAttribute('data-say'));
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
})();
