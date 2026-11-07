/* Connexcy — site scripts */

/*
 * FORM SUBMISSIONS
 * Beta signups and guide requests are sent to the Connexcy app, which stores them
 * (Website leads page) and emails the team.
 */
const FORM_ENDPOINT = "https://app.connexcy.com/api/leads";
const CONTACT_EMAIL = "hello@connexcy.com";

(function () {
  // Mobile menu
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

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
