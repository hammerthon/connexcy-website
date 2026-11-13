/* Connexcy intro (home page): the sound, the skipping and the clean-up for the cinematic intro drawn in
   assets/intro.css. The picture runs on its own 7 s CSS clock from the first paint; this script follows that
   clock, so a late start never puts the sound out of step with the picture.

   Sound: browsers only allow sound once the visitor has interacted with the site, so most first visits start
   silent and offer "Tap for sound"; where the browser already allows it, the sound plays. Either way the same
   button turns it on and off. Skip intro, a click or tap, a key, a scroll or a swipe ends the intro early while
   it covers the page. */
(function () {
  "use strict";
  var root = document.getElementById("cxi");
  if (!root) return;
  var html = document.documentElement;
  // Not playing this visit (the inline script in the page's head decides): take the markup out.
  if (!html.classList.contains("cxi-play")) {
    root.parentNode.removeChild(root);
    return;
  }

  // ---- the times, in seconds on the intro's clock; they match intro.css (and KEY_AT matches the --at times on
  // the letters of the address in index.html) ----
  var INTRO_MS = 7000;
  var KEY_AT = [1.0, 1.09, 1.19, 1.28, 1.4, 1.48, 1.58, 1.69, 1.78, 1.88, 1.97, 2.07];
  var ENTER_AT = 2.25;
  var MARK_AT = 2.35;
  var BOOM_AT = 3.45;
  var LAND_AT = 6.2;
  // The dark has split open and the page shows: from here clicks, keys and scrolling belong to the page.
  // cxi-root in intro.css lets clicks through at the same moment (89% of 7 s).
  var OPEN_AT = 6.23;
  // "Tap for sound" is only offered while enough of the intro is left to hear.
  var OFFER_UNTIL = 5.0;

  /* The sound sprite, assets/intro-sounds.m4a: five keystrokes, a chime, a reversed whoosh that swells into a
     hit, and the hit. [start, length] in seconds. */
  var SOUND_URL = "assets/intro-sounds.m4a?v=1";
  var SPRITE = {
    k1: [0, 0.11], k2: [0.19, 0.11], k3: [0.38, 0.11], k4: [0.57, 0.11], k5: [0.76, 0.11],
    chime: [0.95, 0.62], whoosh: [1.65, 0.57], hit: [2.3, 0.9]
  };
  // Where the sprite's first loud sample is (s); a decoder that keeps the AAC priming silence moves it later.
  var SPRITE_FIRST_LOUD = 0.0015;
  var KEYS = ["k1", "k3", "k2", "k5", "k4", "k1", "k3", "k2", "k4", "k5", "k1", "k3"];
  var SOUNDS = KEY_AT.map(function (at, i) {
    return { at: at, name: KEYS[i % KEYS.length], gain: 0.5, rate: 0.95 + ((i * 37) % 11) / 80 };
  }).concat([
    { at: ENTER_AT, name: "k4", gain: 0.62, rate: 0.82 },
    { at: MARK_AT, name: "chime", gain: 0.5 },
    // The whoosh swells into the boom, then the boom; a softer pair as the page lands.
    { at: BOOM_AT - SPRITE.whoosh[1], name: "whoosh", gain: 0.34 },
    { at: BOOM_AT, name: "hit", gain: 0.75 },
    { at: LAND_AT - SPRITE.whoosh[1], name: "whoosh", gain: 0.24 },
    { at: LAND_AT, name: "hit", gain: 0.36 }
  ]);

  // Keys that move focus, are held for shortcuts, or change the device's volume, media or brightness: no skip.
  var QUIET_KEYS = /^(Tab|Shift|Alt|AltGraph|Control|Meta|OS|Super|Hyper|Fn|FnLock|CapsLock|NumLock|ScrollLock|Symbol|SymbolLock|Unidentified|Audio\w*|Media\w*|Brightness\w*)$/;
  // Keys that scroll the page. One of them skips the intro, but must not also scroll the page out of sight.
  var SCROLL_KEYS = /^( |Spacebar|PageUp|PageDown|Home|End|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/;
  // How far (px) a touch has to travel before it counts as a scroll, so a tap with a little jitter is a tap.
  var TOUCH_SLOP = 10;

  var soundButton = root.querySelector(".cxi-sound");
  var noop = function () {};
  var ended = false;
  var skipping = false;
  // Set once the intro is skipped or gone: sound that is still loading then never starts.
  var stopped = false;
  var timers = [];
  var later = function (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; };
  var quietly = function (p) { if (p && typeof p.then === "function") p.then(noop, noop); };

  // ---- the clock ----
  var timeline = null;
  if (typeof root.getAnimations === "function") {
    var list = root.getAnimations();
    for (var i = 0; i < list.length; i++) {
      if (list[i].animationName === "cxi-root") { timeline = list[i]; break; }
    }
  }
  // Without the Web Animations API (old browsers), the clock is roughly the time since the page started.
  var clock = timeline
    ? function () { return Number(timeline.currentTime || 0) / 1000; }
    : function () { return (window.performance ? performance.now() : 0) / 1000; };

  // ---- ending ----
  var ctx = null;
  // Every scheduled sound: { src, when } (when: its start on the audio clock).
  var playing = [];
  function end() {
    if (ended) return;
    ended = true;
    stopped = true;
    timers.forEach(clearTimeout);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("keydown", onKey);
    document.removeEventListener("focusin", onFocus);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("pagehide", onPageHide);
    html.classList.add("cxi-done");
    if (root.parentNode) root.parentNode.removeChild(root);
    if (ctx) {
      // Sound already playing rings out (the soft hit lands with the page); sound that hasn't started never does.
      var now = ctx.currentTime;
      playing.forEach(function (p) {
        if (p.when > now + 0.02) { try { p.src.stop(); } catch (e) { /* already stopped */ } }
      });
      setTimeout(function () {
        try { quietly(ctx.close()); } catch (e) { /* already closed */ }
        try {
          if (navigator.audioSession && navigator.audioSession.type === "playback") navigator.audioSession.type = "auto";
        } catch (e) { /* not supported */ }
      }, 1500);
    }
  }
  function skip() {
    if (ended || skipping) return;
    skipping = true;
    stopSound(true);
    root.classList.add("is-skipping");
    // The page shows under the fading overlay at once. The faded overlay stays (taking clicks) a little longer
    // than its 0.25 s fade, so a double-click or a second tap doesn't land on a link underneath.
    html.classList.add("cxi-done");
    later(end, 520);
  }

  // The overlay isn't showing (its stylesheet didn't load, or reduced motion turned on): nothing to wait for.
  if (getComputedStyle(root).display === "none" || (timeline && timeline.playState === "finished")) {
    end();
    return;
  }

  // ---- a tab opened in the background ----
  // Chrome starts the clock while nothing is drawn, then jumps it to the time since the page loaded at the first
  // frame, so the visitor would see the end of the intro or none of it. Hold every animation until the tab shows.
  var held = [];
  if (timeline && document.hidden && typeof document.getAnimations === "function") {
    held = document.getAnimations();
    held.forEach(function (a) { try { a.pause(); } catch (e) { /* gone */ } });
  }
  function release() {
    if (!held.length || document.hidden) return;
    held.forEach(function (a) {
      try {
        // play() would rewind an animation that already ended (intro.js ran late, then the tab was hidden).
        var stop = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
        if (a.currentTime != null && a.currentTime >= stop) a.finish();
        else a.play();
      } catch (e) { /* gone */ }
    });
    held = [];
  }

  // ---- sound ----
  // iPhones before iOS 17 silence a page's sound with the silent switch and can't be asked not to, so "Sound on"
  // could play nothing there: no sound on them.
  var oldIOS = /(iPhone|iPad|iPod)[^)]* OS 1[0-6]_/.test(navigator.userAgent || "");
  var AC = window.AudioContext || window.webkitAudioContext;
  if (timeline && AC && !oldIOS) {
    try { ctx = new AC(); } catch (e) { ctx = null; }
  }
  // Every sound goes through this gain, which the sound button turns up and down.
  var master = null;
  var scheduled = false;
  var soundOn = false;
  // The sound button: "off" offers sound ("Tap for sound"), "on" has it playing ("Sound on"), none hides it.
  function showSound(state) {
    if (state) root.setAttribute("data-sound", state);
    else root.removeAttribute("data-sound");
    if (soundButton) soundButton.setAttribute("aria-pressed", state === "on" ? "true" : "false");
  }
  function decode(data) {
    return new Promise(function (resolve, reject) {
      // Older Safari only has the callback form.
      quietly(ctx.decodeAudioData(data, resolve, reject));
    });
  }
  // The sound loads as the intro starts, so a tap on "Tap for sound" is heard at once.
  var sprite = ctx
    ? fetch(SOUND_URL).then(function (res) { if (!res.ok) throw new Error("no sound"); return res.arrayBuffer(); }).then(decode)
    : null;
  if (sprite) quietly(sprite);
  function startSound() {
    if (!ctx || scheduled || stopped || ctx.state !== "running") return;
    scheduled = true;
    master = ctx.createGain();
    master.gain.value = soundOn ? 1 : 0;
    master.connect(ctx.destination);
    sprite
      .then(function (buf) {
        // The clock only means something while the intro is still playing on screen.
        if (stopped || timeline.playState !== "running" || timeline.currentTime == null) return;
        // Some AAC decoders keep the encoder's priming silence at the start; the first keystroke opens the
        // sprite, so its first loud sample shows how far everything moved.
        var data = buf.getChannelData(0);
        var first = 0;
        while (first < data.length && Math.abs(data[first]) < 0.02) first++;
        var shift = Math.min(0.1, Math.max(0, first / buf.sampleRate - SPRITE_FIRST_LOUD));
        var now = clock();
        SOUNDS.forEach(function (s) {
          if (s.at < now - 0.03) return;
          var part = SPRITE[s.name];
          var src = ctx.createBufferSource();
          var gain = ctx.createGain();
          src.buffer = buf;
          src.playbackRate.value = s.rate || 1;
          gain.gain.value = s.gain;
          src.connect(gain);
          gain.connect(master);
          var when = ctx.currentTime + Math.max(0, s.at - now);
          src.start(when, part[0] + shift, part[1]);
          playing.push({ src: src, when: when });
        });
      })
      // No sound after all (the file didn't load or decode): take the button away rather than claim "Sound on".
      .catch(function () { if (!stopped) showSound(null); });
  }
  // On a skip the sound fades out over a few milliseconds (a hard stop clicks); leaving the page stops it at once.
  function stopSound(fade) {
    stopped = true;
    var t = ctx ? ctx.currentTime : 0;
    if (fade && master) {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.setTargetAtTime(0, t, 0.012);
    }
    playing.forEach(function (p) { try { p.src.stop(fade ? t + 0.08 : 0); } catch (e) { /* already stopped */ } });
  }
  // Already allowed (the browser lets this page play sound): play, and show "Sound on" so it can be turned off.
  // Otherwise offer "Tap for sound". A tab opened in the background waits until it is shown.
  function checkSound() {
    if (!ctx || scheduled || stopped || document.hidden || root.hasAttribute("data-sound")) return;
    if (ctx.state === "running") {
      soundOn = true;
      showSound("on");
      startSound();
    } else if (clock() < OFFER_UNTIL) {
      showSound("off");
    }
  }
  function toggleSound(e) {
    e.stopPropagation();
    if (!ctx || stopped) return;
    soundOn = !soundOn;
    showSound(soundOn ? "on" : "off");
    if (master) master.gain.setTargetAtTime(soundOn ? 1 : 0, ctx.currentTime, 0.02);
    if (!soundOn) return;
    // iPhones silence a page's sound with the silent switch unless it asks to play like media (iOS 17 and
    // later); a tap on the button is that ask. It may pause the visitor's own music, as a video would.
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (err) { /* not supported */ }
    var resumed = ctx.resume();
    if (resumed && typeof resumed.then === "function") resumed.then(startSound, noop);
    else startSound();
  }
  if (ctx) {
    quietly(ctx.resume());
    later(checkSound, 80);
  }

  // ---- skipping, only while the overlay still covers the page ----
  var covering = function () { return clock() < OPEN_AT; };
  var tabbedAt = -Infinity;
  var nowMs = function () { return window.performance ? performance.now() : 0; };
  function onKey(e) {
    var key = e.key || "";
    if (key === "Tab") tabbedAt = nowMs();
    if (QUIET_KEYS.test(key)) return;
    var space = key === " " || key === "Spacebar";
    // Enter and Space press Tap for sound, which mustn't skip.
    if (document.activeElement === soundButton && (key === "Enter" || space)) return;
    if (!covering()) return;
    // Space on Skip intro presses it. Any other scrolling key, with or without Option or Cmd (the Mac paging keys),
    // would also scroll the hidden page, so it doesn't; Back, Forward and Home keep working.
    var onButton = root.contains(document.activeElement);
    var browserKey = ((key === "ArrowLeft" || key === "ArrowRight") && (e.altKey || e.ctrlKey || e.metaKey)) || (key === "Home" && e.altKey);
    if (SCROLL_KEYS.test(key) && !browserKey && !(space && onButton)) e.preventDefault();
    skip();
  }
  // Tabbing past the intro's buttons would put focus on links the overlay hides, so it opens the page.
  function onFocus(e) {
    if (covering() && nowMs() - tabbedAt < 1000 && !root.contains(e.target)) skip();
  }
  function onWheel() {
    if (covering()) skip();
  }
  // A swipe skips; a tap that wobbles a few pixels, or any touch on Tap for sound, doesn't.
  var touch = null;
  function onTouchStart(e) {
    var t = e.touches[0];
    touch = t ? { x: t.clientX, y: t.clientY, onSound: !!(soundButton && soundButton.contains(e.target)) } : null;
  }
  function onTouchMove(e) {
    var t = e.touches[0];
    if (!touch || !t || touch.onSound || !covering()) return;
    if (Math.sqrt(Math.pow(t.clientX - touch.x, 2) + Math.pow(t.clientY - touch.y, 2)) > TOUCH_SLOP) skip();
  }
  // Leaving mid-intro (another page, Back): the page comes back finished and silent from the back/forward cache.
  function onPageHide() {
    stopSound();
    end();
  }
  // A click (not a press) skips, so the overlay is still there to take the click when the finger lifts and a long
  // tap can't land on a link underneath.
  root.addEventListener("click", function (e) {
    if (soundButton && soundButton.contains(e.target)) return;
    skip();
  });
  if (soundButton) soundButton.addEventListener("click", toggleSound);

  // ---- the natural end ----
  if (timeline) {
    timeline.addEventListener("finish", function () { setTimeout(end, 0); });
    timeline.addEventListener("cancel", function () { setTimeout(end, 0); });
  }
  // Backstop for the finish event, which only fires while the page renders frames. A hidden tab's clock may
  // stand still, so the backstop only runs while the page is visible.
  var backstop = 0;
  function armBackstop() {
    clearTimeout(backstop);
    if (!document.hidden) backstop = later(end, Math.max(0, INTRO_MS + 100 - clock() * 1000));
  }
  function onVisibility() {
    release();
    armBackstop();
    checkSound();
  }
  armBackstop();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("keydown", onKey);
  document.addEventListener("focusin", onFocus);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("pagehide", onPageHide);
})();
