/* Connexcy — site scripts */

/*
 * FORM SUBMISSIONS
 * Beta signups and guide requests are sent to the Connexcy app, which stores them
 * (Website leads page) and emails the team.
 */
const FORM_ENDPOINT = "https://app.connexcy.com/api/leads";
const CONTACT_EMAIL = "hello@connexcy.com";

(function () {
  // Intro: while it shows, a click, tap, key or scroll skips it. Once it has faded, take it out of
  // the page. If the fade never runs (some embedded browsers don't animate), remove it anyway
  // 3 seconds after the page is visible, so it can never stay over the content.
  const intro = document.querySelector(".intro");
  if (intro && getComputedStyle(intro).display !== "none") {
    intro.addEventListener("animationend", (e) => {
      if (e.target === intro && (e.animationName === "intro-out" || e.animationName === "intro-skip")) intro.remove();
    });
    const skip = () => intro.classList.add("intro-skip");
    intro.addEventListener("click", skip);
    ["keydown", "wheel", "touchstart"].forEach((type) => window.addEventListener(type, skip, { once: true, passive: true }));
    const removeLater = () => setTimeout(() => intro.remove(), 3000);
    if (document.visibilityState === "visible") removeLater();
    else document.addEventListener("visibilitychange", removeLater, { once: true });
  }

  // Videos (the home page's explainer and each industry page's film): every .video-frame with a .video-play button
  // shows that big "Watch" button over the poster; it starts the video and gets out of the way, leaving the native
  // controls.
  document.querySelectorAll(".video-frame").forEach((frame) => {
    const video = frame.querySelector("video");
    const play = frame.querySelector(".video-play");
    if (!video || !play) return;
    // The poster shows only the button; the native controls come back once the video starts.
    play.hidden = false;
    video.controls = false;
    const start = () => {
      frame.classList.add("is-playing");
      video.controls = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
      video.focus();
    };
    play.addEventListener("click", start);
    video.addEventListener("play", () => { frame.classList.add("is-playing"); video.controls = true; });
    autoplay(frame, video);
  });

  // Autoplay: browsers only let a video start by itself when it's muted, so each film starts muted, with its captions
  // showing, once at least half of it is on screen (and, on the home page, once the intro has finished). A "Tap for
  // sound" button turns the sound on and starts the film from the beginning. While it's still playing muted by
  // itself, it pauses when scrolled away and picks up again when it's back. Not for people who ask for reduced motion
  // or to save data; if the browser refuses (some battery-saving modes do), the big "Watch" button stays as before.
  // Links to "#video" (the hero's "Watch the video") start the home film with sound, since the visitor asked for it.
  function autoplay(frame, video) {
    const q = (m) => { try { return window.matchMedia(m).matches; } catch (e) { return false; } };
    const saveData = navigator.connection && navigator.connection.saveData;
    if (q("(prefers-reduced-motion: reduce)") || saveData || !("IntersectionObserver" in window)) return;
    const html = document.documentElement;
    // Films whose words are already on screen (no narration, like the referral film) set data-auto-captions="off",
    // so the captions don't cover the picture; they stay in the player's menu.
    const track = video.dataset.autoCaptions === "off" ? null : video.textTracks && video.textTracks[0];
    const sound = document.createElement("button");
    sound.type = "button";
    sound.className = "video-sound";
    sound.hidden = true;
    sound.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>Tap for sound';
    frame.appendChild(sound);
    let auto = false;     // playing muted by itself (not started by the visitor)
    let visible = false;
    const introRunning = () => html.classList.contains("cxi-play") && !html.classList.contains("cxi-done");
    const tryPlay = () => {
      if (!visible || introRunning() || frame.dataset.autoplayed === "user") return;
      if (!video.paused) return;
      if (frame.dataset.autoplayed && !auto) return; // the visitor paused it: leave it paused
      auto = true;
      frame.dataset.autoplayed = "auto";
      video.muted = true;
      video.preload = "auto";
      if (track) track.mode = "showing";
      const p = video.play();
      if (p && p.then) p.then(() => { sound.hidden = !video.muted; }).catch(() => { auto = false; delete frame.dataset.autoplayed; });
    };
    const withSound = () => {
      auto = false;
      frame.dataset.autoplayed = "user";
      sound.hidden = true;
      video.muted = false;
      if (track) track.mode = "hidden";
      try { video.currentTime = 0; } catch (e) {}
      frame.classList.add("is-playing");
      video.controls = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };
    sound.addEventListener("click", withSound);
    video.addEventListener("volumechange", () => { if (!video.muted) { auto = false; frame.dataset.autoplayed = "user"; sound.hidden = true; } });
    // A pause the visitor makes (not one from scrolling away) ends the autoplay for this film.
    let scrollPause = false;
    video.addEventListener("pause", () => {
      if (scrollPause) { scrollPause = false; if (visible) tryPlay(); return; }
      if (auto && !video.ended) { auto = false; sound.hidden = true; }
    });
    video.addEventListener("ended", () => { auto = false; sound.hidden = true; });
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        visible = e.intersectionRatio >= 0.5;
        if (visible) tryPlay();
        else if (auto && !video.paused) { scrollPause = true; video.pause(); }
      });
    }, { threshold: [0, 0.5] }).observe(frame);
    if (introRunning()) {
      new MutationObserver((_, mo) => { if (!introRunning()) { mo.disconnect(); tryPlay(); } })
        .observe(html, { attributes: true, attributeFilter: ["class"] });
    }
    if (frame.closest("#video")) {
      document.querySelectorAll('a[href="#video"], a[href="index.html#video"]').forEach((a) => a.addEventListener("click", withSound));
    }
  }

  // Mobile menu
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Industries menu (header). On desktop the "Industries" button opens its panel: a click opens or closes it, and a
  // mouse hovering over it opens it until the mouse leaves (a click while hovering keeps it open). Esc, a click
  // outside it, or focus moving out of it closes it; the down arrow on the button opens it and moves into the list,
  // and the up and down arrows move between its links. In the mobile menu (1120px wide and below) the CSS hides the
  // button and always shows the list, so none of this applies there.
  const desktop = window.matchMedia ? window.matchMedia("(min-width: 1121px)") : { matches: true };
  document.querySelectorAll(".nav-dd").forEach((dd) => {
    const btn = dd.querySelector(".nav-dd-btn");
    const panel = dd.querySelector(".nav-dd-panel");
    if (!btn || !panel) return;
    let pinned = false; // opened by a click or a key, so the mouse leaving doesn't close it
    let leaveTimer = 0;
    const isOpen = () => dd.classList.contains("open");
    const links = () => Array.from(panel.querySelectorAll("a"));
    const setOpen = (open) => {
      clearTimeout(leaveTimer);
      dd.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
      if (!open) pinned = false;
    };
    btn.addEventListener("click", () => {
      if (isOpen() && !pinned) { pinned = true; return; }
      setOpen(!isOpen());
      pinned = isOpen();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown") return;
      e.preventDefault();
      setOpen(true);
      pinned = true;
      const first = links()[0];
      if (first) first.focus();
    });
    dd.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || !desktop.matches) return;
      clearTimeout(leaveTimer);
      if (!isOpen()) setOpen(true);
    });
    dd.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse" || pinned || !isOpen()) return;
      leaveTimer = setTimeout(() => { if (!pinned) setOpen(false); }, 200);
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const l = links();
      const i = l.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      l[(i + (e.key === "ArrowDown" ? 1 : l.length - 1)) % l.length].focus();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !isOpen()) return;
      const inside = dd.contains(document.activeElement);
      setOpen(false);
      if (inside && desktop.matches) btn.focus();
    });
    // A press inside the menu (Safari doesn't focus the link it presses) isn't focus leaving it.
    let pressing = false;
    dd.addEventListener("pointerdown", () => { pressing = true; });
    document.addEventListener("pointerup", () => setTimeout(() => { pressing = false; }, 0));
    document.addEventListener("pointercancel", () => { pressing = false; });
    dd.addEventListener("focusout", (e) => {
      if (isOpen() && !pressing && !dd.contains(e.relatedTarget)) setOpen(false);
    });
    document.addEventListener("pointerdown", (e) => {
      if (isOpen() && !dd.contains(e.target)) setOpen(false);
    });
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Reveal on scroll
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("in"));
  }

  // Savings calculator
  const calc = document.querySelector("[data-calc]");
  if (calc) {
    const spend = calc.querySelector("#calc-spend");
    const vendors = calc.querySelector("#calc-vendors");
    const spendOut = calc.querySelector("#calc-spend-out");
    const vendorsOut = calc.querySelector("#calc-vendors-out");
    const low = calc.querySelector("#calc-low");
    const high = calc.querySelector("#calc-high");
    const renewals = calc.querySelector("#calc-renewals");
    const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
    const update = () => {
      const s = Number(spend.value);
      const v = Number(vendors.value);
      spendOut.textContent = money(s);
      vendorsOut.textContent = v.toLocaleString("en-US");
      // 8–15% recoverable. More vendors = more leakage, nudged toward the high end.
      const factor = Math.min(1, v / 150);
      const lowPct = 0.08;
      const highPct = 0.12 + 0.03 * factor;
      low.textContent = money(s * lowPct);
      high.textContent = money(s * highPct);
      renewals.textContent = Math.max(1, Math.round(v / 12)).toLocaleString("en-US");
    };
    spend.addEventListener("input", update);
    vendors.addEventListener("input", update);
    update();
  }

  // Approval preview: demo nudge button (no data is sent)
  document.querySelectorAll("[data-nudge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".appr-card, .feature-visual");
      const toast = wrap && wrap.querySelector(".appr-toast");
      btn.textContent = "✓ Nudged";
      btn.classList.add("sent");
      btn.disabled = true;
      if (toast) toast.hidden = false;
    });
  });

  // Pre-select demo vs beta from URL (?type=demo)
  const typeSelect = document.querySelector("#signup-type");
  if (typeSelect) {
    const t = new URLSearchParams(location.search).get("type");
    if (t === "demo" || t === "beta") typeSelect.value = t;
  }

  // Forms
  const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname) || location.protocol === "file:";

  document.querySelectorAll("form[data-connexy-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = form.querySelector(".form-status");
      const btn = form.querySelector('button[type="submit"]');
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const data = new FormData(form);
      data.set("submitted_at", new Date().toISOString());
      // The app keeps a fixed set of fields (name, email, company, message, ...). Forms with extra details (the
      // referral form's "business you're referring") mark them with data-msg-label, and they go in the message.
      if (form.hasAttribute("data-compose-message")) {
        const lines = [];
        form.querySelectorAll("[data-msg-label]").forEach((el) => {
          const v = (el.value || "").trim();
          if (v) lines.push(`${el.dataset.msgLabel}: ${v}`);
        });
        data.set("message", lines.join("\n"));
      }
      if (status) { status.textContent = ""; status.classList.remove("error"); }
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Sending…"; }

      try {
        if (isLocal && !FORM_ENDPOINT) {
          // Local preview: no form backend, so log and pretend it worked.
          console.info("[Connexcy] Local preview — form not sent:", Object.fromEntries(data));
          await new Promise((r) => setTimeout(r, 400));
        } else if (FORM_ENDPOINT) {
          const res = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(res.status);
        } else {
          const res = await fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(data).toString(),
          });
          if (!res.ok) throw new Error(res.status);
        }
        const target = form.dataset.thanks ? document.querySelector(form.dataset.thanks) : null;
        if (target) { form.hidden = true; target.hidden = false; target.focus?.(); }
        else if (status) { status.textContent = "Thanks! Check your inbox shortly."; form.reset(); }
      } catch (err) {
        if (status) {
          status.classList.add("error");
          status.innerHTML = `Something went wrong. Please try again or email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.`;
        }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      }
    });
  });
})();
