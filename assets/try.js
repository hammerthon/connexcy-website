/* Connexcy "Try it" demo (try.html).
 *
 * One renewal, end to end, with made-up data: a contracts dashboard where time can be skipped ahead so the renewal
 * alerts fire, the contract's key terms with their source sentences, a renewal quote, a comparison with another
 * vendor, an approval chain (nudges, or acting as the approver) and making the approved quote the active contract.
 *
 * Everything runs here, in the browser. No network calls, no cookies, no storage: reloading or "Start over" clears it.
 * "Use your own numbers" swaps the example prices for the visitor's; every figure, and which approvers the amount
 * needs, is worked out from them (see nums()). They stay in memory only, like everything else, and never go in a URL.
 * It only shows what the Connexcy app does (see /Users/hammer/connexy/connexy-app/README.md). Every company, person,
 * vendor and figure is made up, and the vendor names are invented so no real vendor's prices are implied.
 */
(function () {
  "use strict";
  const app = document.getElementById("try-app");
  if (!app) return;
  const main = document.getElementById("try-main");
  const stepsEl = document.getElementById("try-steps");
  const logEl = document.getElementById("try-log");
  const live = document.getElementById("try-live");
  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const reduced = () => motionQuery.matches;

  // ---------------------------------------------------------------------------------------------------------------
  // Helpers
  const D = (y, m, d) => new Date(y, m - 1, d, 12);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const START = D(2026, 9, 25); // the demo's "today" when it starts
  const dayNum = (d) => Math.round((d - START) / 864e5);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtLong = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const money = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const days = (n) => n + (n === 1 ? " day" : " days");
  const pct = (x) => Number(x.toFixed(1)) + "%";
  const listJoin = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

  // ---------------------------------------------------------------------------------------------------------------
  // Made-up company, people, contracts and quotes
  const PEOPLE = {
    robin: { name: "Robin Okafor", first: "Robin", title: "Operations Manager", ini: "RO", c: "#1d4ed8" },
    priya: { name: "Priya Raman", first: "Priya", title: "Head of Customer Support", ini: "PR", c: "#0e7490" },
    marcus: { name: "Marcus Bell", first: "Marcus", title: "Controller", ini: "MB", c: "#be185d" },
    elena: { name: "Elena Sorensen", first: "Elena", title: "CFO", ini: "ES", c: "#6d28d9" },
    theo: { name: "Theo Nakamura", first: "Theo", title: "IT Manager", ini: "TN", c: "#b45309" },
  };
  // Who approves depends on the yearly amount. The help desk belongs to Customer Support, so Priya is the department head.
  const RULE = [
    { label: "Under $25k", who: ["priya"], roles: "Department head" },
    { label: "$25k – $100k", who: ["priya", "marcus"], roles: "Department head → Controller" },
    { label: "Over $100k", who: ["priya", "marcus", "elena"], roles: "Department head → Controller → CFO" },
  ];
  const tierFor = (amount) => (amount < 25000 ? 0 : amount <= 100000 ? 1 : 2);

  const CONTRACTS = [
    { id: "tallowbird", vendor: "Tallowbird Helpdesk", what: "Help desk software", owner: "robin", annual: 48000, renews: D(2027, 3, 1), notice: 60 },
    { id: "pebblecrest", vendor: "Pebblecrest Cloud", what: "Cloud hosting", owner: "theo", annual: 126500, renews: D(2027, 6, 1), notice: 90 },
    { id: "fernwire", vendor: "Fernwire Fiber", what: "Office internet", owner: "theo", annual: 18240, renews: D(2027, 1, 15), notice: 30 },
    { id: "quillmark", vendor: "Quillmark Payroll", what: "Payroll service", owner: "marcus", annual: 22800, renews: D(2027, 8, 1), notice: 60 },
    { id: "ashgrove", vendor: "Ashgrove Properties", what: "Office lease", owner: "robin", annual: 96000, renews: D(2028, 9, 1), notice: 180 },
  ];
  const deadlineOf = (c) => addDays(c.renews, -c.notice);

  // The prices. The example: $48,000 a year today, a +12% renewal quote ($53,760), Mossgate at 7.5% below today for
  // 24 months ($44,400) or 2.5% below for 12 months ($46,800). "Use your own numbers" replaces them; whatever the
  // visitor types stays in this page's memory only (never stored, never sent, never put in the URL).
  const EXAMPLE = { today: 48000, mode: "pct", pct: 12, quote: 53760, alt: null };
  const MAX_AMOUNT = 10000000;
  let NUM = Object.assign({ custom: false }, EXAMPLE);
  function nums() {
    const today = NUM.today;
    const quote = NUM.mode === "pct" ? Math.round(today * (1 + NUM.pct / 100)) : NUM.quote;
    const altGiven = NUM.alt != null;
    const alt24 = altGiven ? NUM.alt : Math.round(today * 0.925);
    const alt12 = altGiven ? NUM.alt : Math.round(today * 0.975);
    return {
      custom: NUM.custom, today, quote, up: quote - today, inc: (quote - today) / today * 100,
      altGiven, alt12, alt24,
      revised: today + Math.round((quote - today) * 2 / 3), // the revised quote after "Request changes": a third off the increase
      matchable: alt24 < quote, // Tallowbird is only asked to match a cheaper offer
    };
  }
  const incText = (P) => (P.up > 0 ? "+" + pct(P.inc) : "no increase");
  const upText = (P) => (P.up > 0 ? "up " + money(P.up) + " (+" + pct(P.inc) + ") from " + money(P.today) : "the same as the " + money(P.today) + " you pay today");
  const QUOTE_DAY = dayNum(D(2026, 11, 4)); // when Tallowbird's renewal quote arrives
  const MAX_DAY = dayNum(D(2026, 12, 31)); // Tallowbird's notice deadline: the demo stops there
  const NEW_START = D(2027, 3, 1);
  const SCHEDULE_CHOICES = [120, 90, 60, 30, 14, 7];

  // The comparison rows (about half of the ~20 clauses the app compares), each with why it matters.
  const ROWS = [
    { k: "price", label: "Annual price", why: "What you’ll pay each year." },
    { k: "term", label: "Term", why: "How long you’re committed." },
    { k: "autoRenew", label: "Auto-renewal", why: "Miss the deadline and it locks in another term by itself." },
    { k: "notice", label: "Notice period", why: "Longer notice means deciding earlier." },
    { k: "cap", label: "Price-increase cap", why: "Limits how much the price can rise at renewal." },
    { k: "sla", label: "Uptime SLA", why: "99.5% allows about 3.6 hours down a month; 99.9% about 44 minutes." },
    { k: "credits", label: "Service credits", why: "What you get back when they miss the uptime target." },
    { k: "breach", label: "Breach notification", why: "How fast they must tell you about a security breach." },
    { k: "deletion", label: "Data deletion", why: "How long your customers’ data stays with them after you leave." },
    { k: "liability", label: "Liability cap", why: "The most they’d owe you if something goes wrong." },
  ];
  // Higher is better (+1) or lower is better (-1); 0: a difference is just "changed".
  const BETTER = { price: -1, term: 0, autoRenew: -1, notice: -1, cap: 1, sla: 1, credits: 1, breach: -1, deletion: -1, liability: 1 };

  // The current, signed Tallowbird contract: each key term with the sentence it came from.
  const CUR = {
    price: { n: 48000, v: "$48,000/yr", sec: "4.1", t: "Customer will pay annual subscription fees of $48,000, invoiced once a year in advance." },
    term: { n: 12, v: "12 months", sec: "2.1", t: "The Initial Term begins on March 1, 2026 and continues for twelve (12) months." },
    autoRenew: { n: 1, v: "Yes, 12 months at a time", sec: "2.2", t: "After the Initial Term, this Agreement renews automatically for successive twelve (12) month periods." },
    notice: { n: 60, v: "60 days", sec: "2.3", t: "Either party may prevent a renewal by giving written notice at least sixty (60) days before the end of the then-current term." },
    cap: { n: 0, v: "None", sec: "4.2", t: "Each renewal term is billed at Tallowbird’s list prices in effect at the time of renewal." },
    sla: { n: 99.9, v: "99.9% a month", sec: "7.1", t: "Tallowbird will make the Service available 99.9% of the time in each calendar month, excluding scheduled maintenance." },
    credits: { n: 10, v: "10% of the monthly fee", sec: "7.3", t: "If Tallowbird misses that target, Customer may claim a service credit of 10% of that month’s fee." },
    breach: { n: 72, v: "Within 72 hours", sec: "8.2", t: "Tallowbird will notify Customer of any security breach affecting Customer Data within seventy-two (72) hours of discovering it." },
    deletion: { n: 30, v: "Within 30 days, certified", sec: "8.4", t: "Within thirty (30) days after this Agreement ends, Tallowbird will delete all Customer Data and, on request, certify the deletion in writing." },
    liability: { n: 12, v: "12 months of fees", sec: "11.1", t: "Each party’s total liability under this Agreement will not exceed the fees paid in the twelve (12) months before the claim." },
  };
  const KEY_TERMS = ["price", "term", "autoRenew", "notice", "cap", "liability", "sla", "deletion", "breach"];
  // The contract excerpt shown next to the key terms ([key] marks a term's source sentence).
  const DOC = [
    ["1. Parties", ["This Master Subscription Agreement is between Tallowbird Helpdesk, Inc. (“Tallowbird”) and Wrenfield Goods Co. (“Customer”)."]],
    ["2. Term and renewal", ["[term]", "[autoRenew]", "[notice]"]],
    ["4. Fees", ["[price]", "[cap]", "4.3 Invoices are due within thirty (30) days of the invoice date."]],
    ["7. Service levels", ["[sla]", "7.2 Tallowbird will post scheduled maintenance at least forty-eight (48) hours in advance.", "[credits]"]],
    ["8. Security and data", ["8.1 Tallowbird will keep a SOC 2 Type II report current for the Service.", "[breach]", "[deletion]"]],
    ["11. Liability", ["[liability]"]],
  ];

  const same = (k) => ({ n: CUR[k].n, v: CUR[k].v, t: CUR[k].t });
  // Each option the visitor can send for approval. rev = the vendor sent a revised quote after "Request changes".
  function spec(id) {
    const rev = S.rev[id] || 0;
    const P = nums();
    if (id === "renewal") {
      const price = rev ? P.revised : P.quote;
      return {
        id, vendor: "Tallowbird Helpdesk", vkey: "tallowbird", name: rev ? "Tallowbird renewal (revised)" : "Tallowbird renewal",
        price, term: 12, notice: rev ? 60 : 90, autoRenew: true,
        vals: {
          price: { n: price, v: money(price) + "/yr", t: rev ? "Revised renewal fees: " + money(price) + " for the next twelve (12) month term, invoiced annually in advance." : "Renewal fees for the next twelve (12) month term: " + money(price) + ", invoiced annually in advance." },
          term: { n: 12, v: "12 months", t: "Renewal Term: twelve (12) months from March 1, 2027." },
          autoRenew: { n: 1, v: "Yes, 12 months at a time", t: "The Agreement continues to renew automatically for successive twelve (12) month periods." },
          notice: rev ? { n: 60, v: "60 days", t: "Notice of non-renewal must be given at least sixty (60) days before the end of the then-current term." }
                      : { n: 90, v: "90 days", t: "Notice of non-renewal must be given at least ninety (90) days before the end of the then-current term." },
          cap: { n: 0, v: "None", t: "Fees for later renewal terms are set at Tallowbird’s then-current list prices." },
          sla: { n: 99.5, v: "99.5% a month", t: "Tallowbird will make the Service available 99.5% of the time in each calendar month." },
          credits: same("credits"), breach: same("breach"), deletion: same("deletion"), liability: same("liability"),
        },
      };
    }
    if (id === "match") {
      return {
        id, vendor: "Tallowbird Helpdesk", vkey: "tallowbird", name: rev ? "Tallowbird, price matched (revised)" : "Tallowbird, price matched",
        price: P.alt24, term: 24, notice: rev ? 60 : 90, autoRenew: true,
        vals: {
          price: { n: P.alt24, v: money(P.alt24) + "/yr", t: "Subscription fees: " + money(P.alt24) + " per year for a twenty-four (24) month term, invoiced annually in advance." },
          term: { n: 24, v: "24 months", t: "Renewal Term: twenty-four (24) months from March 1, 2027." },
          autoRenew: { n: 1, v: "Yes, 12 months at a time", t: "After that, the Agreement renews automatically for successive twelve (12) month periods." },
          notice: rev ? { n: 60, v: "60 days", t: "Notice of non-renewal must be given at least sixty (60) days before the end of the then-current term." }
                      : { n: 90, v: "90 days", t: "Notice of non-renewal must be given at least ninety (90) days before the end of the then-current term." },
          cap: { n: 1, v: "Fixed for 24 months", t: "Fees are fixed for the full twenty-four (24) month term." },
          sla: { n: 99.5, v: "99.5% a month", t: "Tallowbird will make the Service available 99.5% of the time in each calendar month." },
          credits: same("credits"), breach: same("breach"), deletion: same("deletion"), liability: same("liability"),
        },
      };
    }
    // Mossgate Support, the alternative vendor: 12 or 24 months.
    const long = S.moss === 24;
    const price = long ? P.alt24 : P.alt12;
    return {
      id: "moss", vendor: "Mossgate Support", vkey: "mossgate", name: rev ? "Mossgate Support (revised)" : "Mossgate Support",
      price, term: S.moss, notice: 30, autoRenew: false,
      vals: {
        price: { n: price, v: money(price) + "/yr", t: long ? "Fees: " + money(price) + " per year for a twenty-four (24) month commitment, invoiced annually in advance." : "Fees: " + money(price) + " for a twelve (12) month term, invoiced in advance." },
        term: { n: S.moss, v: S.moss + " months", t: "Subscription term: " + (long ? "twenty-four (24)" : "twelve (12)") + " months starting March 1, 2027." },
        autoRenew: { n: 0, v: "No, only if both sides sign", t: "This Order Form does not renew automatically; any renewal requires a new signed Order Form." },
        notice: { n: 30, v: "30 days", t: "Either party may end the Agreement at the end of a term with thirty (30) days’ written notice." },
        cap: { n: 1, v: "Fixed, then 3% at most", t: "Fees are fixed for the term, and any increase at renewal is capped at three percent (3%)." },
        sla: { n: 99.9, v: "99.9% a month", t: "Mossgate will make the Service available 99.9% of the time in each calendar month." },
        credits: { n: 5, v: "5% of the monthly fee", t: "If Mossgate misses that target, Customer may request a credit of 5% of the monthly fee." },
        breach: { n: 48, v: "Within 48 hours", t: "Mossgate will notify Customer of a security breach affecting Customer Data within forty-eight (48) hours." },
        deletion: rev ? { n: 30, v: "Within 30 days, certified", t: "Mossgate will delete all Customer Data within thirty (30) days after termination and certify the deletion on request." }
                      : { n: 90, v: "Within 90 days", t: "Mossgate will delete Customer Data within ninety (90) days after termination." },
        liability: { n: 12, v: "12 months of fees", t: "Mossgate’s total liability will not exceed the fees paid in the twelve (12) months before the claim." },
      },
    };
  }
  const options = () => ["renewal", "moss"].concat(S.match === "ready" && nums().matchable ? ["match"] : []);

  function change(k, val) {
    const a = CUR[k].n, b = val.n;
    if (a === b) return "same";
    if (!BETTER[k]) return "changed";
    return (b - a) * BETTER[k] > 0 ? "better" : "worse";
  }
  function detail(k, val) {
    const a = CUR[k].n, b = val.n;
    if (a === b) return "";
    if (k === "price") { const d = b - a; return (d > 0 ? "+" : "−") + money(Math.abs(d)) + " (" + (d > 0 ? "+" : "−") + pct(Math.abs(d) / a * 100) + ") vs. today"; }
    if (k === "notice") return (b > a ? "+" : "−") + days(Math.abs(b - a)) + (b > a ? ": decide earlier" : ": more time to decide");
    if (k === "term") return b > a ? "Longer commitment" : "Shorter commitment";
    return "";
  }
  // Positive: cheaper than the renewal quote (or than today). Negative: it costs more, and the views say so in words.
  const savings = (s) => { const P = nums(); return { year: P.quote - s.price, term: (P.quote - s.price) * s.term / 12, vsToday: P.today - s.price }; };
  // "saves $9,360/yr vs. the quote", "costs $1,200/yr more than the quote" or "same price as the quote".
  const vsQuote = (v, unit) => (v > 0 ? "saves " + money(v) + unit + " vs. the quote" : v < 0 ? "costs " + money(-v) + unit + " more than the quote" : "same price as the quote");

  const NUDGE_REPLY = {
    priya: "Thanks for the nudge! Approved. My team can work with this.",
    marcus: "Approved. It fits next year’s Support budget.",
    elena: "Approved.",
  };
  const CHANGE_ASK = {
    renewal: "Ask Tallowbird to keep the 60-day notice and bring the increase down.",
    match: "Fine on price, but ask them to keep the 60-day notice.",
    moss: "Ask Mossgate to delete our data within 30 days, like we have today.",
  };
  function revisedText(id) {
    const P = nums();
    if (id === "renewal") {
      return P.up > 0
        ? "Tallowbird sent a revised quote: " + money(P.revised) + "/yr (+" + pct((P.revised - P.today) / P.today * 100) + " instead of +" + pct(P.inc) + "), with the 60-day notice period back."
        : "Tallowbird sent a revised quote: the same " + money(P.revised) + "/yr, with the 60-day notice period back.";
    }
    if (id === "match") return "Tallowbird kept the matched price and put the 60-day notice period back.";
    return "Mossgate sent a revised order form: your data deleted within 30 days, certified.";
  }

  // ---------------------------------------------------------------------------------------------------------------
  // State
  let S;
  let timers = [];
  function fresh() {
    return {
      day: 0, min: 0, step: 1, visited: { 1: true },
      contracts: CONTRACTS.map((c) => Object.assign({}, c)),
      schedule: [90, 60, 30], newSchedule: [90, 60, 30],
      fired: {}, feed: [], freshIds: [],
      quote: false, hl: null,
      moss: 24, match: "none", matchRound: 0, rev: { renewal: 0, match: 0, moss: 0 }, revWaiting: false,
      pick: "moss", sub: null, round: 0,
      nudgeOpen: false, nudgeNote: "", waiting: null,
      asApprover: false, apprNote: "",
      live: null, log: [],
    };
  }
  const today = () => addDays(START, S.day);
  function stamp() {
    const h = 9 + Math.floor(S.min / 60), m = S.min % 60;
    return fmtShort(today()) + ", " + ((h + 11) % 12 + 1) + ":" + String(m).padStart(2, "0") + (h < 12 ? " AM" : " PM");
  }
  const tick = (m) => { S.min = Math.min(S.min + m, 8 * 60 + 50); };
  // text can be a function, for lines whose figures follow the numbers in use (the renewal quote).
  function log(text, kind) { S.log.unshift({ t: stamp(), text, kind: kind || "" }); }
  function later(ms, fn) {
    const id = setTimeout(() => { timers = timers.filter((x) => x !== id); fn(); }, ms);
    timers.push(id);
  }
  function announce(msg) {
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 50);
  }
  const person = (p) => PEOPLE[p];
  const who = (p) => person(p).name + ", " + person(p).title;

  // ---------------------------------------------------------------------------------------------------------------
  // "Use your own numbers": the form's draft (what's typed, kept across re-renders) and its inline errors.
  const freshNumsUI = () => ({ open: false, draft: null, errs: {} });
  let numsUI = freshNumsUI();
  const plain = (n) => Math.round(n).toLocaleString("en-US");
  function draftFrom() {
    const P = nums();
    return { today: plain(P.today), mode: NUM.mode, pct: String(Number(P.inc.toFixed(1))), quote: plain(P.quote), alt: P.altGiven ? plain(NUM.alt) : "" };
  }
  // Puts the numbers in use into the current contract's price term and the dashboard row.
  function syncNums() {
    const P = nums();
    CUR.price = { n: P.today, v: money(P.today) + "/yr", sec: "4.1", t: "Customer will pay annual subscription fees of " + money(P.today) + ", invoiced once a year in advance." };
    if (S && !S.live) S.contracts[0].annual = P.today;
  }
  // "$48,000", "48000", "48k" and "1.2m" all work. Anything else is NaN, which the checks below turn into a message.
  function parseAmount(raw) {
    const m = /^(\d+(?:\.\d+)?|\.\d+)([km]?)$/.exec(String(raw).trim().toLowerCase().replace(/[\s,$]/g, ""));
    return m ? Math.round(Number(m[1]) * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1)) : NaN;
  }
  function amountCheck(raw, what) {
    if (!String(raw).trim()) return { err: "Enter " + what + "." };
    const n = parseAmount(raw);
    if (!isFinite(n)) return { err: "Enter a dollar amount, like 48,000." };
    if (n < 100) return { err: "Enter at least $100 a year." };
    if (n > MAX_AMOUNT) return { err: "Keep it to $10,000,000 a year or less." };
    return { n };
  }
  function checkNums(d) {
    const errs = {}, val = { custom: true, mode: d.mode, pct: null, quote: null, alt: null };
    const t = amountCheck(d.today, "what you pay today, per year");
    if (t.err) errs.today = t.err; else val.today = t.n;
    if (d.mode === "pct") {
      const raw = String(d.pct).trim().replace(/[\s%+]/g, "");
      if (!raw) errs.pct = "Enter the increase, like 12.";
      else if (/^[-−–]/.test(raw)) errs.pct = "Enter 0 or more: this demo is about renewal increases.";
      else if (!/^(\d+(\.\d+)?|\.\d+)$/.test(raw)) errs.pct = "Enter a number from 0 to 100, like 12 or 7.5.";
      else if (Number(raw) > 100) errs.pct = "Keep the increase to 100% or less.";
      else if (val.today && Math.round(val.today * (1 + Number(raw) / 100)) > MAX_AMOUNT) errs.pct = "That puts the quote over $10,000,000 a year. Try a smaller increase.";
      else val.pct = Number(raw);
    } else {
      const q = amountCheck(d.quote, "the quoted price per year");
      if (q.err) errs.quote = q.err;
      else if (val.today && q.n < val.today) errs.quote = "That’s below the " + money(val.today) + " you pay today. This demo is about renewal increases: enter " + money(val.today) + " or more.";
      else if (val.today && q.n > val.today * 2) errs.quote = "That’s more than double today’s price. Keep it to " + money(val.today * 2) + " or less.";
      else val.quote = q.n;
    }
    if (String(d.alt).trim()) { const a = amountCheck(d.alt, "the other vendor’s price"); if (a.err) errs.alt = a.err; else val.alt = a.n; }
    return { errs, val };
  }
  // After the numbers change: everything derived is worked out again on the next render; a price match is withdrawn.
  function numsChanged() {
    syncNums();
    tick(2);
    if (S.match !== "none") {
      S.match = "none"; S.matchRound++;
      if (S.pick === "match") S.pick = "moss";
      log("The numbers changed, so Tallowbird’s price match was withdrawn. Ask again to get one at the new price.");
    }
    const P = nums();
    log((P.custom ? "You switched to your own numbers: " : "You went back to the example numbers: ") + money(P.today) + "/yr today, renewal quote " + money(P.quote) + "/yr (" + incText(P) + "), Mossgate " + money(P.alt24) + "/yr.");
  }
  function numsSummary() {
    const P = nums();
    const r = RULE[tierFor(P.quote)];
    return (P.custom ? "Using your numbers. " : "Using the example numbers. ") + "Today " + money(P.today) + " a year; renewal quote " + money(P.quote) + " (" + incText(P) + "); Mossgate " + money(P.alt24) + " a year. " +
      "Approving the renewal needs " + r.roles.replace(/ → /g, ", then ") + "." + (P.alt24 >= P.quote ? " Mossgate costs more than the renewal quote." : "");
  }

  // Alerts: each contract's owner is emailed N days before its notice deadline, and on the deadline itself.
  const scheduleOf = (c) => (c.isNew ? c.schedule : c.id === "tallowbird" ? S.schedule : [90, 60, 30]);
  function events() {
    const ev = [];
    S.contracts.forEach((c) => {
      if (c.isNew) return;
      scheduleOf(c).concat([0]).forEach((d) => ev.push({ id: c.id + ":" + d, c, d, day: dayNum(addDays(deadlineOf(c), -d)) }));
    });
    ev.push({ id: "quote", day: QUOTE_DAY });
    return ev.sort((a, b) => a.day - b.day || (b.d || 0) - (a.d || 0));
  }
  function alertText(c, d) {
    return d
      ? { title: c.vendor + ": notice due in " + days(d), body: "It renews by itself on " + fmt(c.renews) + " unless you give notice by " + fmt(deadlineOf(c)) + "." }
      : { title: c.vendor + ": the notice deadline is today", body: "Last day to give notice. After today it renews by itself on " + fmt(c.renews) + "." };
  }
  function fire(e, quiet) {
    if (e.id === "quote") {
      S.quote = true;
      // The quote's figures are worked out when shown, so they follow "Use your own numbers".
      S.feed.unshift({ id: e.id, ico: "📄", day: e.day, title: "Renewal quote from Tallowbird Helpdesk", body: () => { const P = nums(); return money(P.quote) + "/yr: " + upText(P) + "."; }, to: "robin" });
      if (!quiet) log(() => { const P = nums(); return "Tallowbird sent its renewal quote: " + money(P.quote) + "/yr, " + (P.up > 0 ? "up " + pct(P.inc) : "no increase") + ". You uploaded the PDF and its terms filled in."; }, "alert");
      return;
    }
    const t = alertText(e.c, e.d);
    S.feed.unshift({ id: e.id, ico: "📧", day: e.day, title: t.title, body: t.body, to: e.c.owner });
    if (!quiet) log("Alert: " + t.title + ". Emailed " + who(e.c.owner) + ".", "alert");
  }
  // keepNums: start the renewal again with the visitor's own numbers ("Try the other path"). Otherwise back to the example.
  function reset(keepNums) {
    timers.forEach(clearTimeout);
    timers = [];
    if (!keepNums) { NUM = Object.assign({ custom: false }, EXAMPLE); numsUI = freshNumsUI(); }
    S = fresh();
    syncNums();
    // Alerts already sent before the demo's first day (shown in the feed, not the log).
    events().forEach((e) => { if (e.day < 0 && e.day > -30) { S.fired[e.id] = true; fire(e, true); } });
    log("You signed in to Connexcy as Robin Okafor, Operations Manager.");
  }
  function advanceTo(target) {
    target = Math.min(target, MAX_DAY);
    if (target <= S.day) return;
    const fired = [];
    S.lastSkip = target === S.day + 1 ? "on " + fmtShort(addDays(START, target)) : "between " + fmtShort(addDays(START, S.day + 1)) + " and " + fmtShort(addDays(START, target));
    events().forEach((e) => {
      if (e.day > S.day && e.day <= target && !S.fired[e.id]) {
        S.fired[e.id] = true;
        S.day = e.day; S.min = 0;
        fire(e);
        fired.push(e);
      }
    });
    S.day = target; S.min = 0;
    S.freshIds = fired.map((e) => e.id);
    let msg = "Today is now " + fmtLong(today()) + ". ";
    if (!fired.length) msg += "No new alerts.";
    else msg += fired.map((e) => (e.id === "quote" ? "Tallowbird’s renewal quote arrived: " + money(nums().quote) + " a year, " + (nums().up > 0 ? "up " + pct(nums().inc) : "no increase") + "." : alertText(e.c, e.d).title + ", emailed to " + who(e.c.owner) + ".")).join(" ");
    announce(msg);
  }
  const nextEventDay = () => { const e = events().find((x) => x.day > S.day && !S.fired[x.id] && x.day <= MAX_DAY); return e ? e.day : null; };

  // Approvals
  const pending = () => (S.sub ? S.sub.chain.find((s) => s.status === "pending") : null);
  function submit(id) {
    const s = spec(id);
    const tier = tierFor(s.price);
    S.round++;
    S.sub = { id, spec: s, status: "pending", chain: RULE[tier].who.map((p, i) => ({ p, status: i ? "next" : "pending", note: "", at: "", nudges: 0 })) };
    S.asApprover = false; S.nudgeOpen = false; S.nudgeNote = ""; S.waiting = null; S.apprNote = "";
    tick(6);
    log("You sent " + s.name + " (" + money(s.price) + "/yr, " + s.term + " months) for approval. The rule for " + RULE[tier].label + " a year: " + RULE[tier].roles + ".", "good");
    const first = S.sub.chain[0].p;
    log("Connexcy emailed " + who(first) + ": it’s their turn.");
    goStep(4, "Sent for approval. " + who(first) + ", is reviewing now.");
  }
  function decide(step, decision, note, viaNudge) {
    const p = person(step.p);
    const sub = S.sub;
    step.at = stamp();
    if (decision === "approve") {
      step.status = "approved";
      step.note = note || "Approved.";
      log(p.name + " (" + p.title + ") approved" + (viaNudge ? " a few minutes after the nudge" : "") + ": “" + step.note + "”", "good");
      const i = sub.chain.indexOf(step);
      const next = sub.chain[i + 1];
      if (next) {
        next.status = "pending";
        log("Connexcy emailed " + who(next.p) + ": it’s their turn.");
        return p.first + " approved. " + who(next.p) + ", is reviewing now.";
      }
      sub.status = "approved";
      S.asApprover = false;
      log("Fully approved. " + sub.spec.name + " is ready to become the active contract.", "good");
      return p.first + " approved. The quote is fully approved and ready to go live.";
    }
    if (decision === "changes") {
      step.status = "changes";
      step.note = note || (S.rev[sub.id] ? "Still not right. Let’s talk before the deadline." : CHANGE_ASK[sub.id]);
      sub.status = "changes";
      S.asApprover = false;
      log(p.name + " (" + p.title + ") requested changes: “" + step.note + "”", "bad");
      return p.first + " requested changes. It’s back with you, Robin.";
    }
    step.status = "rejected";
    step.note = note || "Rejected. Let’s look at the other options before the Dec 31 deadline.";
    sub.status = "rejected";
    S.asApprover = false;
    log(p.name + " (" + p.title + ") rejected it: “" + step.note + "”", "bad");
    return p.first + " rejected it. It’s back with you, Robin.";
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Rendering
  const STEPS = ["Contracts", "What’s written", "Compare", "Approve", "Go live"];
  function unlocked(n) {
    if (n <= 2) return true;
    if (n === 3) return S.quote;
    if (n === 4) return !!S.sub;
    return !!S.live || (!!S.sub && S.sub.status === "approved");
  }
  function done(n) {
    return [S.quote, !!S.sub || !!S.visited[3], !!S.sub && !!S.visited[3], !!S.sub && S.sub.status === "approved", !!S.live][n - 1];
  }
  function stepsHtml() {
    return STEPS.map((label, i) => {
      const n = i + 1, cur = S.step === n, open = unlocked(n), ok = done(n) && !cur;
      return '<li><button type="button" class="try-step' + (ok ? " is-done" : "") + '" data-act="go" data-n="' + n + '" data-fk="step-' + n + '"' +
        (cur ? ' aria-current="step"' : "") + (open ? "" : " disabled") + '><span class="n" aria-hidden="true">' + (ok ? "✓" : n) + "</span><span>" +
        '<span class="try-sr">Step ' + n + ": </span>" + label + (ok ? '<span class="try-sr"> (done)</span>' : "") + (open ? "" : '<span class="try-sr"> (not reached yet)</span>') +
        "</span></button></li>";
    }).join("");
  }
  const pav = (p, mark) => '<span class="pav" style="--c:' + person(p).c + '" aria-hidden="true">' + person(p).ini + (mark || "") + "</span>";
  const pavSm = (p) => '<span class="pav sm" style="--c:' + person(p).c + '" aria-hidden="true">' + person(p).ini + "</span>";
  const btn = (act, label, cls, extra) => '<button type="button" class="btn ' + (cls || "btn-primary") + ' btn-sm" data-act="' + act + '"' + (extra || "") + ">" + label + "</button>";
  const heading = (text) => '<h2 tabindex="-1" id="try-h">' + text + "</h2>";

  // The "Use your own numbers" panel (on Contracts and Compare): the numbers in use, which approvals the renewal
  // needs at that amount, and the form. Fixed once something is sent for approval, so the chain matches its amount.
  function numInput(id, key, label, pre, post, hint) {
    const err = numsUI.errs[key];
    const desc = [hint ? id + "-hint" : "", err ? id + "-err" : ""].filter(Boolean).join(" ");
    return '<label for="' + id + '">' + label + '</label><div class="try-input' + (err ? " is-bad" : "") + '">' + (pre ? '<span class="aff" aria-hidden="true">' + pre + "</span>" : "") +
      '<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" maxlength="20" id="' + id + '" data-fk="' + id + '" data-num="' + key + '" value="' + esc(numsUI.draft[key]) + '"' +
      (desc ? ' aria-describedby="' + desc + '"' : "") + (err ? ' aria-invalid="true"' : "") + ">" + (post ? '<span class="aff" aria-hidden="true">' + post + "</span>" : "") + "</div>" +
      (err ? '<p class="try-err" id="' + id + '-err">' + esc(err) + "</p>" : "") + (hint ? '<small id="' + id + '-hint">' + hint + "</small>" : "");
  }
  function numsHtml() {
    const P = nums();
    const locked = !!S.sub || !!S.live;
    const r = RULE[tierFor(P.quote)];
    let h = '<section class="try-nums' + (P.custom ? " is-custom" : "") + '" aria-labelledby="try-nums-h"><div class="try-nums-bar"><div class="try-nums-sum">' +
      '<h3 id="try-nums-h">' + (P.custom ? "Your numbers" : "Example numbers") + "</h3>" +
      '<p class="try-nums-figs"><span>Today <b>' + money(P.today) + "/yr</b></span><span>Renewal quote <b>" + money(P.quote) + "/yr</b> (" + incText(P) + ")</span>" +
      "<span>Mossgate <b>" + money(P.alt24) + "/yr</b>" + (P.altGiven ? "" : " for 24 months") + "</span></p>" +
      '<p class="try-nums-appr">Renewing at ' + money(P.quote) + " needs: <b>" + r.roles + "</b> <span class=\"muted\">(" + r.label + ")</span></p></div>";
    if (locked) {
      h += '<div class="try-nums-btns"><p class="muted">Fixed once a quote is sent for approval.</p>' + btn("nums-restart", "Start over with new numbers", "btn-ghost", ' data-fk="nums-restart"') + "</div></div>";
      return h + "</section>";
    }
    h += '<div class="try-nums-btns">' + btn("nums-toggle", numsUI.open ? "Close" : P.custom ? "Change your numbers" : "Use your own numbers", numsUI.open ? "btn-ghost" : "btn-primary", ' data-fk="nums-toggle" aria-expanded="' + numsUI.open + '" aria-controls="try-nums-form"') +
      (P.custom ? btn("nums-example", "Use example numbers", "btn-ghost", ' data-fk="nums-example"') : "") + "</div></div>";
    if (numsUI.open) {
      const d = numsUI.draft;
      h += '<form class="try-nums-form" id="try-nums-form" novalidate><p class="try-nums-note">Try it with one of your own contracts. Yearly amounts in dollars. What you type stays in this page: it isn’t saved or sent anywhere.</p><div class="try-nums-grid">' +
        '<div class="try-field">' + numInput("num-today", "today", "What you pay today, per year", "$", "", "") + "</div>" +
        '<fieldset class="try-field"><legend>The renewal quote</legend><div class="try-seg try-qmode">' +
        '<span class="opt"><input type="radio" name="try-qmode" id="qmode-pct" value="pct" data-fk="qmode-pct"' + (d.mode === "pct" ? " checked" : "") + '><label for="qmode-pct">% increase</label></span>' +
        '<span class="opt"><input type="radio" name="try-qmode" id="qmode-price" value="price" data-fk="qmode-price"' + (d.mode === "price" ? " checked" : "") + '><label for="qmode-price">Quoted price</label></span></div>' +
        (d.mode === "pct" ? numInput("num-pct", "pct", "Increase at renewal", "", "%", "0 to 100.") : numInput("num-quote", "quote", "Quoted price per year", "$", "", "")) + "</fieldset>" +
        '<div class="try-field">' + numInput("num-alt", "alt", "Another vendor’s price per year <span class=\"muted\">(optional)</span>", "$", "",
          "Shown as Mossgate. Left blank: 7.5% below today for 24 months, as in the example. It can cost more than the renewal; the demo will say so.") + "</div>" +
        '</div><div class="try-actions"><button type="submit" class="btn btn-primary btn-sm" data-fk="nums-apply">Use these numbers</button>' +
        btn("nums-example", "Use example numbers", "btn-ghost", ' data-fk="nums-example-2"') + "</div></form>";
    }
    return h + "</section>";
  }

  function badgeFor(c) {
    const n = dayNum(deadlineOf(c)) - S.day;
    if (n < 0) return ["badge-red", "Notice deadline passed"];
    if (n === 0) return ["badge-red", "Notice due today"];
    if (n > 365) return ["badge-green", "On track"];
    const cls = n <= 30 ? "badge-red" : n <= 60 ? "badge-amber" : n <= 90 ? "badge-blue" : "badge-gray";
    return [cls, "Notice due in " + days(n)];
  }
  function tallowStatus() {
    if (S.live) return "";
    if (S.sub && S.sub.status === "approved") return '<span class="badge badge-green">Approved</span>';
    if (S.sub && S.sub.status === "pending") return '<span class="badge badge-blue">In approval</span>';
    if (S.quote) return '<span class="badge badge-amber">Renewal quote: ' + incText(nums()) + "</span>";
    return "";
  }

  function feedItem(f, fresh) {
    return '<li class="' + (fresh ? "is-fresh" : "") + '"><span class="ico" aria-hidden="true">' + f.ico + "</span><span><b>" + esc(f.title) + "</b>" + esc(typeof f.body === "function" ? f.body() : f.body) +
      '<span class="to">To ' + who(f.to) + "</span></span>" + '<span class="when">' + fmtShort(addDays(START, f.day)) + "</span></li>";
  }
  function panelContracts() {
    const atEnd = S.day >= MAX_DAY;
    const nextDay = nextEventDay();
    const tb = S.contracts[0];
    const tbLeft = dayNum(deadlineOf(tb)) - S.day;
    const within90 = S.contracts.filter((c) => { const n = dayNum(deadlineOf(c)) - S.day; return n >= 0 && n <= 90; }).length;
    const total = S.contracts.reduce((a, c) => a + c.annual, 0);
    let h = '<div class="try-panel">' + heading("Contracts") +
      '<p class="try-sub">Wrenfield Goods Co.’s vendor contracts. Connexcy tracks each one’s notice deadline, not just its end date, and emails the contract’s owner before it.</p>';
    h += numsHtml();
    h += '<div class="try-time"><div><span class="k">Today (simulated)</span><span class="today">' + fmtLong(today()) + "</span></div>" +
      '<div class="btns" role="group" aria-label="Move time forward">' +
      '<button type="button" class="btn-time" data-act="skip" data-n="1" data-fk="skip1"' + (atEnd ? " disabled" : "") + ">Skip ahead a day</button>" +
      '<button type="button" class="btn-time primary" data-act="skip" data-n="7" data-fk="skip7"' + (atEnd ? " disabled" : "") + ">Skip ahead a week</button>" +
      '<button type="button" class="btn-time" data-act="next-alert" data-fk="skipnext"' + (nextDay === null ? " disabled" : "") + ">Jump to the next alert</button>" +
      "</div></div>";
    const fresh = S.feed.filter((f) => S.freshIds.indexOf(f.id) >= 0);
    if (fresh.length) {
      h += '<div class="try-new"><h3>Just sent</h3><ul class="try-alerts">' + fresh.map((f) => feedItem(f, true)).join("") + "</ul></div>";
    } else if (S.day > 0 && S.freshIds.length === 0 && S.lastSkip) {
      h += '<p class="try-new-none">No new alerts ' + S.lastSkip + ".</p>";
    }
    if (S.day === 0) h += '<p class="try-hint">👉 Try it: skip ahead a week and watch the first alert reach the contract’s owner.</p>';
    else if (!S.quote) h += '<p class="try-hint">👉 Keep going: Tallowbird’s renewal quote arrives on Nov 4. “Jump to the next alert” gets there fastest.</p>';
    if (!S.live && S.quote && tbLeft <= 30) {
      h += '<p class="try-warn" role="note">⚠️ ' + (tbLeft === 0 ? "Today is Tallowbird’s notice deadline." : "Tallowbird’s notice deadline is in " + days(tbLeft) + ".") +
        " If nobody decides, it renews by itself on Mar 1, 2027 at the quoted " + money(nums().quote) + " a year." + (tbLeft === 0 ? " (The demo’s clock stops here.)" : "") + "</p>";
    }
    h += '<div class="try-kpis"><div class="kpi"><div class="k">Active contracts</div><div class="v">' + S.contracts.length + "</div></div>" +
      '<div class="kpi"><div class="k">Yearly value</div><div class="v">' + money(total) + "</div></div>" +
      '<div class="kpi"><div class="k">Notice due ≤ 90 days</div><div class="v' + (within90 ? " warn" : "") + '">' + within90 + "</div></div></div>";
    h += '<table class="try-table"><caption class="try-sr">Contracts, with renewal dates and notice deadlines</caption><thead><tr><th scope="col">Contract</th><th scope="col">Owner</th><th scope="col">Yearly value</th><th scope="col">Renews</th><th scope="col">Notice deadline</th><th scope="col"><span class="try-sr">Open</span></th></tr></thead><tbody>';
    S.contracts.forEach((c) => {
      const b = badgeFor(c);
      const renewLeft = dayNum(c.renews) - S.day;
      const isTb = c.id === "tallowbird";
      const cls = c.isNew ? "is-new" : isTb ? "is-focus" : "";
      const sub = c.isNew ? (c.replaced ? "Help desk software · replaces " + c.replaced + " on " + fmtShort(NEW_START) : "Help desk software · new terms from " + fmtShort(NEW_START)) : c.what;
      h += '<tr class="' + cls + '"><td class="v" data-label="Contract"><strong>' + esc(c.vendor) + "</strong><small>" + esc(sub) + "</small></td>" +
        '<td data-label="Owner"><span>' + person(c.owner).name + "<small>" + person(c.owner).title + "</small></span></td>" +
        '<td class="num" data-label="Yearly value"><span>' + money(c.annual) + "</span></td>" +
        '<td data-label="Renews"><span>' + fmt(c.renews) + "<small>in " + days(renewLeft) + "</small></span></td>" +
        '<td data-label="Notice deadline"><span>' + fmt(deadlineOf(c)) + '<small><span class="badge ' + b[0] + '">' + b[1] + "</span>" + (isTb ? " " + tallowStatus() : "") + "</small></span></td>" +
        '<td class="act" data-label="">' + (isTb ? btn("go", "Open", "btn-ghost", ' data-n="' + (c.isNew ? 5 : 2) + '" data-fk="open-tb" aria-label="Open the ' + esc(c.vendor) + ' contract"') : "") + "</td></tr>";
    });
    h += "</tbody></table>";
    h += '<h3 style="margin-top:20px">All alerts sent</h3><ul class="try-alerts">';
    if (!S.feed.length) h += '<li><span class="muted">No alerts yet.</span></li>';
    S.feed.forEach((f) => { h += feedItem(f, false); });
    h += "</ul>";
    h += '<div class="try-actions">' + btn("go", S.live ? "See what went live →" : "Open the Tallowbird contract →", "btn-primary", ' data-n="' + (S.live ? 5 : 2) + '" data-fk="cont1"') + "</div></div>";
    return h;
  }

  function panelContract() {
    const tb = CONTRACTS[0];
    const dl = deadlineOf(tb);
    let h = '<div class="try-panel">' + heading("Tallowbird Helpdesk: what’s written") +
      '<p class="try-sub">Connexcy pulled these key terms out of the signed contract, and a person checked each one. Click a term to see the sentence it came from.</p>';
    h += '<div class="try-facts">' +
      '<div><div class="k">Renews</div><div class="v">' + fmt(tb.renews) + '</div><div class="muted" style="font-size:.78rem">in ' + days(dayNum(tb.renews) - S.day) + "</div></div>" +
      '<div class="warn"><div class="k">Notice deadline</div><div class="v">' + fmt(dl) + '</div><div style="font-size:.78rem;color:var(--amber-text)">60 days before it renews</div></div>' +
      '<div><div class="k">Owner</div><div class="v">Robin Okafor</div><div class="muted" style="font-size:.78rem">Operations Manager</div></div>' +
      '<div><div class="k">Department</div><div class="v">Customer Support</div><div class="muted" style="font-size:.78rem">Head: Priya Raman</div></div></div>';
    h += '<div class="try-contract"><div><h3>Key terms <span class="try-checked">✓ Checked by a person</span></h3><ul class="try-terms">';
    KEY_TERMS.forEach((k) => {
      const row = ROWS.find((r) => r.k === k);
      h += '<li><button type="button" class="try-term" data-act="hl" data-k="' + k + '" data-fk="term-' + k + '" aria-pressed="' + (S.hl === k) + '" aria-controls="try-doc">' +
        '<span class="l">' + row.label + '</span><span class="v">' + CUR[k].v + '</span><span class="s">§' + CUR[k].sec + "</span></button></li>";
    });
    h += "</ul>";
    if (!S.live) {
      const sched = S.schedule.slice().sort((a, b) => b - a);
      h += '<div class="try-box" style="margin-top:14px"><h3 id="try-sched-h">Alert schedule</h3><p style="font-size:.86rem;margin:0 0 10px">Days before the notice deadline (' + fmt(dl) +
        ") when Robin gets an email. Pick any schedule the contract needs.</p>" + '<div class="try-sched" role="group" aria-labelledby="try-sched-h">';
      SCHEDULE_CHOICES.forEach((d) => {
        const on = S.schedule.indexOf(d) >= 0;
        const date = addDays(dl, -d);
        const sent = S.fired["tallowbird:" + d];
        const passed = !sent && dayNum(date) <= S.day;
        h += '<button type="button" class="try-chip" data-act="sched" data-n="' + d + '" data-fk="sched-' + d + '" aria-pressed="' + on + '" title="' + fmt(date) + '">' + d + " days" + (sent ? " ✓" : passed ? " · passed" : "") +
          '<span class="try-sr">, ' + fmt(date) + (sent ? ", already sent" : passed ? ", date already passed" : "") + "</span></button>";
      });
      h += '<span class="try-chip fixed">On the deadline</span></div><p class="muted" style="font-size:.78rem;margin:8px 0 0">Now: ' +
        (sched.length ? listJoin(sched.map(String)) + " days before, " : "") + "plus the deadline itself. Alerts already sent (✓) stay sent; dates that have passed don’t send.</p></div>";
    }
    h += '</div><div class="try-doc"><div class="try-doc-head"><span>Tallowbird-MSA-2026.pdf</span><span class="muted">Excerpt</span></div>' +
      '<div class="try-doc-body" id="try-doc" tabindex="0" role="region" aria-label="Contract excerpt">';
    DOC.forEach((sec) => {
      h += "<h4>" + sec[0] + "</h4>";
      sec[1].forEach((line) => {
        const m = /^\[(\w+)\]$/.exec(line);
        if (m) {
          const k = m[1];
          h += '<p><span class="try-src' + (S.hl === k ? " is-hl" : "") + '" id="src-' + k + '">' + CUR[k].sec + " " + esc(CUR[k].t) + "</span></p>";
        } else h += "<p>" + esc(line) + "</p>";
      });
    });
    h += "</div></div></div>";
    // The renewal quote
    if (S.live) {
      h += '<div class="try-quote"><h3>✅ Decided</h3><p style="margin:0">' + esc(S.live.spec.name) + " is the active contract now. " + btn("go", "See what went live", "btn-ghost", ' data-n="5" data-fk="q-live"') + "</p></div>";
    } else if (!S.quote) {
      h += '<div class="try-quote"><h3>No renewal quote yet</h3><p>Tallowbird usually sends one about two months before the deadline. Skip ahead to see it arrive.</p>' +
        '<div class="try-actions">' + btn("to-quote", "Skip ahead to Nov 4, when it arrives", "btn-primary", ' data-fk="q-skip"') + "</div></div>";
    } else if (S.sub && (S.sub.status === "pending" || S.sub.status === "approved")) {
      h += '<div class="try-quote"><h3>Sent for approval</h3><p style="margin:0 0 4px">' + esc(S.sub.spec.name) + ", " + money(S.sub.spec.price) + "/yr. " +
        (S.sub.status === "approved" ? "Fully approved." : "Waiting on " + who(pending().p) + ".") + "</p>" +
        '<div class="try-actions">' + btn("go", S.sub.status === "approved" ? "Go live →" : "See the approval chain →", "btn-primary", ' data-n="' + (S.sub.status === "approved" ? 5 : 4) + '" data-fk="q-see"') + "</div></div>";
    } else {
      const P = nums();
      h += '<div class="try-quote"><h3>Renewal quote from Tallowbird <span class="badge ' + (P.up > 0 ? "badge-red" : "badge-gray") + '">' + incText(P) + "</span></h3>" +
        "<p style=\"margin:0\">Arrived " + fmt(addDays(START, QUOTE_DAY)) + ". You uploaded the PDF and its terms filled in. What changed:</p><ul>" +
        "<li>Price: <strong>" + money(P.quote) + "/yr</strong>, " + upText(P) + "</li>" +
        "<li>Notice period: 60 → <strong>90 days</strong> (you’d have to decide a month earlier next time)</li>" +
        "<li>Uptime SLA: 99.9% → <strong>99.5%</strong></li></ul>" +
        '<div class="try-actions">' + btn("go", "Compare with another vendor", "btn-primary", ' data-n="3" data-fk="q-cmp"') + btn("send", "Send renewal for approval", "btn-dark", ' data-id="renewal" data-fk="q-send"') + "</div></div>";
    }
    return h + "</div>";
  }

  function savingsHtml(s, labels) {
    const v = savings(s), P = nums();
    const cell = (k, val, small, neg) => '<div><div class="k">' + k + '</div><div class="v' + (neg ? " neg" : "") + '">' + val + "</div><small>" + small + "</small></div>";
    // When the option costs more than the quote, say "Extra … $X more" rather than showing negative savings.
    const more = v.year < 0;
    return '<div class="try-savings">' +
      cell((more ? "Extra " : "Saved ") + (labels ? "this year" : "per year"), more ? money(-v.year) + " more" : money(v.year),
        v.year ? (more ? "than the " : "vs. the ") + money(P.quote) + " renewal quote" : labels ? "Renewed at the quoted price" : "This is the renewal quote", more) +
      cell((more ? "Extra" : "Saved") + " over the " + s.term + "-month term", more ? money(-v.term) + " more" : money(v.term), more ? "than renewing as quoted" : "vs. renewing as quoted", more) +
      cell(labels ? "Compared with last year" : "Per year vs. today’s price", v.vsToday > 0 ? money(v.vsToday) + " less" : v.vsToday < 0 ? money(-v.vsToday) + " more" : "Same",
        (labels ? "last year: " : "today: ") + money(P.today) + "/yr", v.vsToday < 0) +
      "</div>";
  }

  function panelCompare() {
    const ids = options();
    if (ids.indexOf(S.pick) < 0) S.pick = ids[0];
    const sel = spec(S.pick);
    let h = '<div class="try-panel">' + heading("Compare: renew, or switch?") +
      '<p class="try-sub">Mossgate Support quoted the same help desk service. Each option is compared with your current Tallowbird contract, term by term. Pick the one to send for approval.</p>';
    h += numsHtml();
    const P = nums();
    h += '<fieldset class="try-picks"><legend>Option to send for approval</legend>';
    ids.forEach((id) => {
      const s = spec(id);
      h += '<div class="try-pick"><input type="radio" name="try-pick" id="pick-' + id + '" value="' + id + '" data-fk="pick-' + id + '"' + (S.pick === id ? " checked" : "") + ">" +
        '<label for="pick-' + id + '"><b>' + esc(s.name) + '</b><span class="p">' + money(s.price) + "/yr</span><small>" + s.term + " months · " +
        (id === "renewal" && !S.rev.renewal ? "as quoted, " + incText(P) : vsQuote(savings(s).year, "/yr")) + "</small></label></div>";
    });
    h += "</fieldset>";
    h += '<div class="try-row"><fieldset class="try-seg"><legend>Mossgate term:</legend>' +
      '<span class="opt"><input type="radio" name="try-moss" id="moss-12" value="12" data-fk="moss-12"' + (S.moss === 12 ? " checked" : "") + '><label for="moss-12">12 months · ' + money(P.alt12) + "/yr</label></span>" +
      '<span class="opt"><input type="radio" name="try-moss" id="moss-24" value="24" data-fk="moss-24"' + (S.moss === 24 ? " checked" : "") + '><label for="moss-24">24 months · ' + money(P.alt24) + "/yr</label></span></fieldset>";
    if (!P.matchable) h += '<span class="muted" style="font-size:.84rem">Nothing to ask Tallowbird to match: Mossgate’s 24-month price isn’t below its quote.</span>';
    else if (S.match === "none") h += btn("match", "Ask Tallowbird to match", "btn-ghost", ' data-fk="match"');
    else if (S.match === "asked") h += '<span class="try-waiting" role="status">Waiting for Tallowbird’s reply <span class="try-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
    else h += '<span class="try-checked">✓ Tallowbird matched: ' + money(P.alt24) + "/yr for 24 months</span>";
    h += "</div>";
    const selMore = savings(sel).year < 0;
    h += '<h3 style="margin-top:18px">' + (selMore ? "Cost" : "Savings") + " with " + esc(sel.name) + (sel.id === "moss" ? " (" + sel.term + " months)" : "") + "</h3>" + savingsHtml(sel);
    if (selMore) {
      h += '<p class="try-warn" role="note" style="margin:0 0 12px">' + esc(sel.name) + " costs " + money(-savings(sel).year) + " a year more than Tallowbird’s " + money(P.quote) + " renewal quote. " +
        "Switching doesn’t always save money. It can still be worth it for better terms, which the table below shows; it’s your call, and your approvers’.</p>";
    }
    let better = 0, worse = 0, changed = 0;
    ROWS.forEach((r) => { const c = change(r.k, sel.vals[r.k]); if (c === "better") better++; else if (c === "worse") worse++; else if (c === "changed") changed++; });
    h += '<p class="try-verdict"><span>' + esc(sel.name) + ": <strong>" + better + " better</strong>, <strong>" + worse + " worse</strong>" + (changed ? ", " + changed + " changed" : "") + " compared with your current contract.</span></p>";
    // Comparison table (stacks into one card per term on phones)
    const cols = [{ id: "cur", name: "Current contract", sub: "Tallowbird, today" }].concat(ids.map((id) => ({ id, name: spec(id).name, sub: money(spec(id).price) + "/yr · " + spec(id).term + " mo" })));
    h += '<div class="try-cmp-wrap"><table class="try-cmp"><caption class="try-sr">Current contract compared with each option, term by term</caption><thead><tr><th scope="col">Term</th>';
    cols.forEach((c) => { h += '<th scope="col" class="' + (c.id === S.pick ? "is-sel" : "") + '">' + esc(c.name) + "<small>" + c.sub + (c.id === S.pick ? " · picked" : "") + "</small></th>"; });
    h += "</tr></thead><tbody>";
    ROWS.forEach((r) => {
      h += '<tr><th scope="row">' + r.label + '<span class="why">' + r.why + "</span></th>";
      cols.forEach((c) => {
        const isCur = c.id === "cur";
        const val = isCur ? CUR[r.k] : spec(c.id).vals[r.k];
        let cell = '<span class="val">' + esc(val.v) + "</span>";
        if (!isCur) {
          const ch = change(r.k, val);
          const det = detail(r.k, val);
          cell += '<span class="chg chg-' + ch + '">' + { better: "▲ Better", worse: "▼ Worse", same: "Same", changed: "Changed" }[ch] + "</span>";
          if (det) cell += '<span class="det ' + ch + '">' + esc(det) + "</span>";
        }
        cell += "<details><summary>Source" + (isCur ? " §" + CUR[r.k].sec : "") + '<span class="try-sr"> for ' + esc(c.name) + ", " + r.label + "</span></summary><q>" + esc(val.t) + "</q></details>";
        h += '<td data-label="' + esc(c.name) + '" class="' + (c.id === S.pick ? "is-sel" : "") + '">' + cell + "</td>";
      });
      h += "</tr>";
    });
    h += "</tbody></table></div>";
    const tier = tierFor(sel.price);
    const busy = S.sub && (S.sub.status === "pending" || S.sub.status === "approved");
    h += '<div class="try-box" style="margin-top:16px">';
    if (S.live) h += "<p style=\"margin:0\">Decided: " + esc(S.live.spec.name) + " is the active contract. " + btn("go", "See what went live", "btn-ghost", ' data-n="5" data-fk="c-live"') + "</p>";
    else if (busy) h += "<p style=\"margin:0 0 10px\">" + esc(S.sub.spec.name) + " is already " + (S.sub.status === "approved" ? "approved" : "waiting for approval") + ".</p>" + btn("go", "See the approval chain →", "btn-primary", ' data-n="4" data-fk="c-see"');
    else {
      h += "<p style=\"margin:0 0 10px\">At " + money(sel.price) + " a year this needs: <strong>" + RULE[tier].who.map((p) => person(p).name).join(" → ") + "</strong> (" + RULE[tier].label + ").</p>" +
        btn("send", "Send " + esc(sel.name) + " for approval", "btn-primary", ' data-id="' + sel.id + '" data-fk="c-send"');
    }
    return h + "</div></div>";
  }

  function chainHtml(sub) {
    const n = sub.chain.length;
    const ok = sub.chain.filter((s) => s.status === "approved").length;
    const halted = sub.status === "changes" || sub.status === "rejected";
    let h = '<div class="appr-progress" role="progressbar" aria-label="Approvals" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + ok + '" aria-valuetext="' + ok + " of " + n + ' approved"><span style="width:' + Math.round(ok / n * 100) + '%"></span></div>';
    h += '<p class="muted" style="margin:-14px 0 16px;font-size:.82rem">' + ok + " of " + n + " approved</p>";
    h += '<ol class="appr-chain">';
    let pop = "";
    sub.chain.forEach((s, i) => {
      const p = person(s.p);
      let cls = "", mark = "", state = "";
      if (s.status === "approved") { cls = "done"; mark = '<i class="ok">✓</i>'; state = "Approved " + s.at; }
      else if (s.status === "pending") { cls = "now"; mark = '<i class="wait">⏳</i>'; state = "Reviewing now" + (s.nudges ? " · 👋 " + s.nudges : ""); }
      else if (s.status === "changes") { cls = "chg-req"; mark = '<i class="wait">✎</i>'; state = "Changes requested " + s.at; }
      else if (s.status === "rejected") { cls = "rej"; mark = '<i class="no">✕</i>'; state = "Rejected " + s.at; }
      else { cls = "next"; state = halted ? "Not reached" : "Up next"; }
      h += '<li class="' + cls + '">' + pav(s.p, mark) + "<b>" + p.name + "</b><small>" + p.title + "</small><em>" + state + "</em>";
      if (s.note) h += '<span class="try-comment">“' + esc(s.note) + "”</span>";
      if (s.status === "pending" && sub.status === "pending" && !S.asApprover) {
        if (S.waiting === s.p) {
          h += '<span class="try-waiting">Waiting for ' + p.first + ' <span class="try-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
        } else {
          h += '<button type="button" class="nudge-btn" data-act="nudge-open" data-fk="nudge-' + i + '" aria-expanded="' + S.nudgeOpen + '" aria-controls="try-nudge-pop">👋 Nudge ' + p.first + "</button>";
          if (S.nudgeOpen) {
            pop = '<div class="try-nudge-pop" id="try-nudge-pop"><label for="try-nudge-note">Optional note to ' + p.first + "</label>" +
              '<textarea id="try-nudge-note" maxlength="500" data-fk="nudge-note" placeholder="e.g. Tallowbird needs an answer by Friday 🙏">' + esc(S.nudgeNote) + "</textarea>" +
              '<div class="try-actions" style="margin-top:8px">' + btn("nudge-send", "Send nudge", "btn-primary", ' data-fk="nudge-send"') + btn("nudge-cancel", "Cancel", "btn-ghost", ' data-fk="nudge-cancel"') + "</div></div>";
          }
        }
      }
      h += "</li>";
    });
    return h + "</ol>" + pop;
  }

  function panelApprove() {
    const sub = S.sub;
    if (!sub) {
      return '<div class="try-panel">' + heading("Approve") + '<p class="try-sub">Nothing has been sent for approval yet.</p>' +
        '<div class="try-actions">' + btn("go", "Back to compare", "btn-primary", ' data-n="3" data-fk="a-back"') + "</div></div>";
    }
    const s = sub.spec;
    const tier = tierFor(s.price);
    const statusLabel = { pending: "Waiting for approval", approved: "Fully approved", changes: "Changes requested", rejected: "Rejected" }[sub.status];
    let h = '<div class="try-panel">' + heading("Approval: " + esc(s.name)) +
      '<div class="try-appr-head"><span>' + esc(s.vendor) + " · " + s.term + " months · submitted by Robin Okafor</span><span><span class=\"amt\">" + money(s.price) + "/yr</span> " +
      '<span class="try-status ' + sub.status + '">' + statusLabel + "</span></span></div>";
    h += '<div class="try-appr"><div class="try-box try-chain-card">' + chainHtml(sub);
    const cur = pending();
    if (sub.status === "pending" && cur) {
      h += '<div class="try-viewas"><span style="font-size:.86rem">' + (S.asApprover ? "You’re seeing it as " + person(cur.p).first + "." : "You’re seeing it as Robin, who sent it.") + "</span>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-act="viewas" data-fk="viewas" aria-pressed="' + S.asApprover + '">' + (S.asApprover ? "Back to Robin’s view" : "See it as the approver") + "</button></div>";
      if (S.asApprover) {
        const p = person(cur.p);
        h += '<div class="try-approver" role="group" aria-labelledby="try-appr-who"><div class="who">' + pavSm(cur.p) + '<span id="try-appr-who">' + p.name + "<small>" + p.title + " · it’s your turn</small></span></div>" +
          '<label for="try-appr-note">Comment <span class="muted">(optional)</span></label><textarea id="try-appr-note" maxlength="500" data-fk="appr-note" placeholder="e.g. ' +
          esc(CHANGE_ASK[sub.id]) + '">' + esc(S.apprNote) + "</textarea>" +
          '<div class="try-actions" style="margin-top:10px">' + btn("decide", "Approve", "btn-primary", ' data-d="approve" data-fk="d-approve"') +
          btn("decide", "Request changes", "btn-warn", ' data-d="changes" data-fk="d-changes"') + btn("decide", "Reject", "btn-danger", ' data-d="reject" data-fk="d-reject"') + "</div></div>";
      }
    }
    if (sub.status === "approved") {
      h += '<div class="try-ok" style="margin-top:14px">✓ Fully approved. Next: make it the active contract.</div><div class="try-actions">' + btn("go", "Go live →", "btn-primary", ' data-n="5" data-fk="a-live"') + "</div>";
    } else if (sub.status === "changes") {
      const vendor = sub.spec.vendor.split(" ")[0];
      h += '<div class="try-warn" style="margin-top:14px">It’s back with you. The notice deadline is still Dec 31, 2026.</div><div class="try-actions">';
      if (S.revWaiting) h += '<span class="try-waiting" role="status">Waiting for ' + vendor + '’s revised quote <span class="try-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>';
      else if (!S.rev[sub.id]) h += btn("revise", "Ask " + vendor + " for a revised quote", "btn-primary", ' data-fk="a-revise"');
      else h += '<span class="muted" style="font-size:.86rem">' + vendor + " says this is their final offer.</span>";
      h += btn("go", "Back to compare", "btn-ghost", ' data-n="3" data-fk="a-cmp"') + "</div>";
    } else if (sub.status === "rejected") {
      h += '<div class="try-warn" style="margin-top:14px">Rejected. If nothing is approved by Dec 31, 2026, Tallowbird renews by itself at ' + money(nums().quote) + " a year.</div>" +
        '<div class="try-actions">' + btn("go", "Back to compare and pick another option", "btn-primary", ' data-n="3" data-fk="a-cmp"') + "</div>";
    }
    h += "</div>";
    h += '<div class="try-box try-rule"><h3>Who approves what</h3><p class="muted" style="font-size:.82rem;margin:0 0 6px">Set by Wrenfield on Connexcy’s approval chain page, by yearly amount.</p>';
    RULE.forEach((r, i) => {
      h += '<div class="tier-row' + (i === tier ? " is-this" : "") + '"><span class="tier-amt">' + r.label + "</span>" +
        r.who.map((p) => '<span class="pav sm" style="--c:' + person(p).c + '" title="' + who(p) + '" aria-hidden="true">' + person(p).ini + "</span>").join('<span class="arr" aria-hidden="true">→</span>') +
        (i === tier ? '<span class="this">This quote</span>' : "") + '<span class="try-sr">: ' + r.roles + (i === tier ? " (applies to this quote)" : "") + "</span></div>";
    });
    h += '<p class="who" style="margin:10px 0 0">Department head: Priya Raman · Controller: Marcus Bell · CFO: Elena Sorensen</p></div></div></div>';
    return h;
  }

  function schedDates(s) {
    const dl = addDays(addMonths(NEW_START, s.term), -s.notice);
    return S.newSchedule.slice().sort((a, b) => b - a).map((d) => fmt(addDays(dl, -d))).concat([fmt(dl) + " (deadline)"]);
  }

  function panelLive() {
    if (!S.live && !(S.sub && S.sub.status === "approved")) {
      return '<div class="try-panel">' + heading("Go live") + '<p class="try-sub">Not approved yet. Once everyone in the chain approves, you can make it the active contract here.</p>' +
        '<div class="try-actions">' + btn("go", "See the approval chain", "btn-primary", ' data-n="4" data-fk="l-back"') + "</div></div>";
    }
    if (!S.live) {
      const s = S.sub.spec;
      const renews = addMonths(NEW_START, s.term);
      const dl = addDays(renews, -s.notice);
      let h = '<div class="try-panel">' + heading("Go live") +
        '<p class="try-sub">Approved by ' + listJoin(S.sub.chain.map((x) => person(x.p).name)) + ". One click makes it the active contract, with its dates and alerts.</p>";
      h += '<dl class="try-dl"><div><dt>Vendor</dt><dd>' + esc(s.vendor) + "</dd></div><div><dt>Yearly price</dt><dd>" + money(s.price) + "</dd></div>" +
        "<div><dt>Starts</dt><dd>" + fmt(NEW_START) + "</dd></div><div><dt>" + (s.autoRenew ? "Renews" : "Ends") + "</dt><dd>" + fmt(renews) + "</dd></div>" +
        "<div><dt>Notice deadline</dt><dd>" + fmt(dl) + " (" + days(s.notice) + ")</dd></div></dl>";
      h += '<div class="try-box"><h3 id="try-nsched-h">Alert schedule for the new contract</h3><p style="font-size:.86rem;margin:0 0 10px">Days before ' + fmt(dl) + " when Robin gets an email.</p>" +
        '<div class="try-sched" role="group" aria-labelledby="try-nsched-h">';
      SCHEDULE_CHOICES.forEach((d) => {
        h += '<button type="button" class="try-chip" data-act="nsched" data-n="' + d + '" data-fk="nsched-' + d + '" aria-pressed="' + (S.newSchedule.indexOf(d) >= 0) + '">' + d + " days</button>";
      });
      h += '<span class="try-chip fixed">On the deadline</span></div><p class="muted" style="font-size:.78rem;margin:8px 0 0">Alerts on ' + listJoin(schedDates(s)) + ".</p></div>";
      h += savingsHtml(s, true);
      h += '<div class="try-actions"><button type="button" class="btn btn-primary" data-act="golive" data-fk="golive">Make it the active contract</button></div></div>';
      return h;
    }
    const L = S.live, s = L.spec;
    let h = '<div class="try-panel">' + heading("Live: " + esc(s.vendor) + " is your help desk contract");
    h += '<div class="try-summary"><div class="try-summary-head"><h3>✓ ' + esc(s.name) + ", " + money(s.price) + "/yr for " + s.term + " months</h3><p>Made active " + L.at + " by Robin Okafor</p></div>" +
      '<div class="try-summary-body">' + savingsHtml(s, true) +
      '<dl class="try-dl"><div><dt>Starts</dt><dd>' + fmt(NEW_START) + "</dd></div><div><dt>" + (s.autoRenew ? "Renews" : "Ends") + "</dt><dd>" + fmt(L.renews) + "</dd></div>" +
      "<div><dt>Notice deadline</dt><dd>" + fmt(L.deadline) + "</dd></div><div><dt>Alerts to Robin</dt><dd>" + listJoin(L.alerts) + "</dd></div></dl>" +
      '<h3>Approved by</h3><ul class="try-approvals">' +
      L.chain.map((x) => "<li>" + pavSm(x.p) + "<span><strong>" + person(x.p).name + "</strong>, " + person(x.p).title + "<small>Approved " + x.at + (x.note ? ": “" + esc(x.note) + "”" : "") + "</small></span></li>").join("") +
      "</ul>";
    if (L.switched) h += '<p class="try-hint" style="margin:14px 0 0">📌 Still to do: tell Tallowbird in writing by Dec 31, 2026 that you won’t renew (section 2.3 of the old contract).</p>';
    h += "</div></div>";
    h += nextStepHtml(s, L);
    h += '<div class="try-actions">' + btn("go", "See the updated dashboard", "btn-ghost", ' data-n="1" data-fk="l-dash"') + "</div>";
    return h + "</div>";
  }

  // The next step after go-live: the result in one line, then sign up (the site's usual beta link, nothing typed here
  // goes with it), or run it again the other way.
  function nextStepHtml(s, L) {
    const v = savings(s), P = nums();
    let big, sub;
    if (v.year > 0) {
      big = "You’d save " + money(v.year) + " a year";
      sub = (s.term > 12 ? money(v.term) + " over the " + s.term + "-month term, compared" : "Compared") + " with renewing at Tallowbird’s " + money(P.quote) + " quote.";
    } else if (v.year < 0) {
      big = "This choice costs " + money(-v.year) + " a year more";
      sub = "than renewing at Tallowbird’s " + money(P.quote) + " quote, for the terms you preferred. Connexcy shows that trade-off before anyone signs.";
    } else {
      big = P.up > 0 ? "Renewing as quoted costs " + money(P.up) + " a year more than today" : "Renewed at today’s price";
      sub = "Alerts months before the notice deadline leave time to compare, push back or switch.";
    }
    const other = L.switched ? "renewal" : "moss";
    return '<section class="try-next" aria-labelledby="try-next-h"><h3 id="try-next-h">Do this with your real contracts</h3>' +
      '<p class="try-next-tag">' + (P.custom ? "With your numbers" : "With the example numbers") + '</p><p class="try-next-big">' + big + '</p><p class="try-next-sub">' + sub + "</p>" +
      "<p>Join the Connexcy beta and our team will help you load your contracts, check the key terms and set up your alerts and approval chain.</p>" +
      '<div class="try-actions"><a class="btn btn-primary" href="beta.html" data-fk="next-beta">Join the beta</a>' +
      '<button type="button" class="btn btn-ghost-light" data-act="other-path" data-id="' + other + '" data-fk="next-other">Try the other path: ' + (other === "moss" ? "switch to Mossgate" : "renew with Tallowbird") + "</button>" +
      '<button type="button" class="btn btn-ghost-light" data-act="reset" data-fk="l-reset">Start over</button></div></section>';
  }

  function logHtml() {
    return S.log.map((l) => '<li class="' + (l.kind ? "k-" + l.kind : "") + '"><time>' + l.t + "</time>" + esc(typeof l.text === "function" ? l.text() : l.text) + "</li>").join("");
  }

  function render(opts) {
    opts = opts || {};
    const active = document.activeElement;
    const fk = active && app.contains(active) ? active.getAttribute("data-fk") : null;
    const hadFocusInside = !!(active && (main.contains(active) || stepsEl.contains(active)));
    stepsEl.innerHTML = stepsHtml();
    main.innerHTML = [panelContracts, panelContract, panelCompare, panelApprove, panelLive][S.step - 1]();
    logEl.innerHTML = logHtml();
    let target = null;
    if (opts.focus === "heading") target = main.querySelector("#try-h");
    else if (opts.focus) target = app.querySelector('[data-fk="' + opts.focus + '"]') || main.querySelector("#try-h");
    else if (fk) {
      target = app.querySelector('[data-fk="' + fk + '"]');
      if (target && target.disabled) target = null;
      if (!target && hadFocusInside) target = main.querySelector("#try-h");
    }
    if (target && target !== document.activeElement) target.focus({ preventScroll: true });
    if (opts.scroll) {
      const top = app.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) window.scrollTo({ top: window.scrollY + top - 84, behavior: reduced() ? "auto" : "smooth" });
    }
  }
  function goStep(n, msg) {
    if (!unlocked(n)) return;
    S.step = n;
    S.visited[n] = true;
    S.nudgeOpen = false;
    S.freshIds = [];
    S.lastSkip = "";
    render({ focus: "heading", scroll: true });
    announce((msg ? msg + " " : "") + "Step " + n + " of 5: " + STEPS[n - 1] + ".");
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Events
  app.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !app.contains(b) || b.disabled) return;
    const act = b.getAttribute("data-act");
    const n = Number(b.getAttribute("data-n"));
    if (act === "reset") {
      reset();
      render({ focus: "heading", scroll: true });
      announce("Started over with the example numbers. Today is " + fmtLong(today()) + ".");
    } else if (act === "other-path") {
      // Same numbers, back at the day the quote arrives, with the other option picked on the Compare step.
      const id = b.getAttribute("data-id");
      reset(true);
      advanceTo(QUOTE_DAY);
      S.pick = id;
      log("You started over to try the other path: " + (id === "moss" ? "switching to Mossgate." : "renewing with Tallowbird."));
      goStep(3, "Started over with the same numbers, on " + fmtLong(today()) + ", when Tallowbird’s quote arrived. " + spec(id).name + " is picked.");
    } else if (act === "nums-toggle") {
      numsUI.open = !numsUI.open;
      numsUI.errs = {};
      if (numsUI.open) numsUI.draft = draftFrom();
      render({ focus: numsUI.open ? "num-today" : "nums-toggle" });
    } else if (act === "nums-example") {
      const was = NUM.custom;
      NUM = Object.assign({ custom: false }, EXAMPLE);
      numsUI = freshNumsUI();
      if (was) numsChanged();
      render({ focus: "nums-toggle" });
      announce(numsSummary());
    } else if (act === "nums-restart") {
      reset(true);
      numsUI.open = true; numsUI.errs = {}; numsUI.draft = draftFrom();
      render({ focus: "num-today", scroll: true });
      announce("Started over with the same numbers. Change them in the form, then choose Use these numbers.");
    } else if (act === "go") {
      goStep(n);
    } else if (act === "skip") {
      advanceTo(S.day + n);
      render();
    } else if (act === "next-alert") {
      const d = nextEventDay();
      if (d !== null) advanceTo(d);
      render();
    } else if (act === "to-quote") {
      advanceTo(QUOTE_DAY);
      S.freshIds = [];
      render({ focus: "q-cmp" });
    } else if (act === "hl") {
      const k = b.getAttribute("data-k");
      S.hl = S.hl === k ? null : k;
      render();
      const el = S.hl && document.getElementById("src-" + k);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
        announce("Highlighted in the contract, section " + CUR[k].sec + ": " + CUR[k].t);
      } else announce("Highlight cleared.");
    } else if (act === "sched" || act === "nsched") {
      const list = act === "sched" ? S.schedule : S.newSchedule;
      const i = list.indexOf(n);
      if (i >= 0) list.splice(i, 1); else list.push(n);
      const sorted = list.slice().sort((a, c) => c - a);
      const desc = (sorted.length ? sorted.join(", ") + " days before the deadline, plus " : "Only ") + "the deadline itself";
      tick(1);
      log("You changed the " + (act === "sched" ? "Tallowbird" : "new contract’s") + " alert schedule: " + desc + ".");
      render();
      announce((i >= 0 ? "Removed" : "Added") + " the " + n + "-day alert. Alerts: " + desc + ".");
    } else if (act === "match") {
      S.match = "asked";
      tick(4);
      log("You asked Tallowbird’s account manager to match Mossgate’s price.");
      render({ focus: "pick-" + S.pick });
      announce("Asked Tallowbird to match. Waiting for their reply.");
      const round = S.matchRound;
      later(2400, () => {
        if (S.matchRound !== round || S.match !== "asked") return; // the numbers changed while waiting
        const price = money(nums().alt24);
        S.match = "ready";
        tick(25);
        log("Tallowbird will match: " + price + "/yr if you sign for 24 months. You uploaded their new quote and its terms filled in.", "good");
        if (S.step === 3) render();
        announce("Tallowbird replied: they’ll match " + price + " a year for 24 months. It’s now an option in the comparison.");
      });
    } else if (act === "send") {
      submit(b.getAttribute("data-id"));
    } else if (act === "nudge-open") {
      S.nudgeOpen = !S.nudgeOpen;
      render({ focus: S.nudgeOpen ? "nudge-note" : null });
    } else if (act === "nudge-cancel") {
      S.nudgeOpen = false;
      render();
      const nb = main.querySelector(".nudge-btn");
      if (nb) nb.focus();
    } else if (act === "nudge-send") {
      const step = pending();
      if (!step) return;
      const p = person(step.p);
      const note = S.nudgeNote.trim();
      step.nudges++;
      tick(3);
      log("You nudged " + p.name + (note ? ": “" + note + "”" : "") + ". Connexcy sent an email and an in-app notification.");
      S.nudgeOpen = false; S.nudgeNote = ""; S.waiting = step.p;
      render({ focus: "viewas" });
      announce("Nudge sent to " + p.name + ". Waiting for a reply.");
      const round = S.round;
      later(2600, () => {
        if (!S.sub || S.round !== round || pending() !== step || S.waiting !== step.p) return;
        S.waiting = null;
        tick(17);
        const msg = decide(step, "approve", NUDGE_REPLY[step.p], true);
        render();
        announce(msg);
      });
    } else if (act === "viewas") {
      S.asApprover = !S.asApprover;
      S.nudgeOpen = false;
      render({ focus: S.asApprover ? "appr-note" : "viewas" });
      announce(S.asApprover ? "You’re now seeing it as " + who(pending().p) + ". It’s their turn to decide." : "Back to Robin’s view.");
    } else if (act === "decide") {
      const step = pending();
      if (!step) return;
      S.waiting = null;
      const note = S.apprNote.trim();
      S.apprNote = "";
      tick(9);
      const msg = decide(step, b.getAttribute("data-d"), note, false);
      const st = S.sub.status;
      render({ focus: st === "pending" ? (S.asApprover ? "appr-note" : "viewas") : st === "approved" ? "a-live" : st === "changes" ? "a-revise" : "a-cmp" });
      announce(msg);
    } else if (act === "revise") {
      const id = S.sub.id;
      S.revWaiting = true;
      tick(5);
      log("You asked " + S.sub.spec.vendor + " for a revised quote.");
      render({ focus: "a-cmp" });
      announce("Asked for a revised quote. Waiting for the vendor.");
      later(2400, () => {
        S.revWaiting = false;
        S.rev[id] = 1;
        if (id === "match") S.match = "ready";
        S.pick = id;
        tick(40);
        log(revisedText(id) + " You uploaded it and its terms filled in.", "good");
        goStep(3, revisedText(id));
      });
    } else if (act === "golive") {
      const s = S.sub.spec;
      const renews = addMonths(NEW_START, s.term);
      const c = S.contracts[0];
      tick(6);
      S.live = {
        spec: s, at: stamp(), renews, deadline: addDays(renews, -s.notice), switched: s.vkey !== "tallowbird",
        chain: S.sub.chain.map((x) => Object.assign({}, x)), alerts: schedDates(s),
      };
      Object.assign(c, { vendor: s.vendor, annual: s.price, renews, notice: s.notice, isNew: true, schedule: S.newSchedule.slice(), replaced: s.vkey !== "tallowbird" ? "Tallowbird Helpdesk" : "" });
      const v = savings(s);
      log("You made " + s.name + " the active contract: " + money(s.price) + "/yr from " + fmt(NEW_START) + ", " + (s.autoRenew ? "renews " : "ends ") + fmt(renews) + ", notice deadline " + fmt(S.live.deadline) + ".", "good");
      log("Alert schedule set: " + listJoin(S.live.alerts) + ". Emails go to Robin Okafor.");
      S.feed.unshift({ id: "live", ico: "✅", day: S.day, title: s.vendor + " is now the active help desk contract", body: "Alerts set for " + listJoin(S.live.alerts) + ".", to: "robin" });
      S.freshIds = ["live"];
      render({ focus: "heading", scroll: true });
      announce(s.vendor + " is now the active contract. " + (v.year > 0 ? "Saved " + money(v.year) + " this year and " + money(v.term) + " over the term, compared with the renewal quote."
        : v.year < 0 ? "It costs " + money(-v.year) + " a year more than the renewal quote." : v.vsToday < 0 ? "Renewed at the quoted price: " + money(-v.vsToday) + " a year more than last year." : "Renewed at the quoted price."));
    }
  });

  app.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "try-pick") {
      S.pick = t.value;
      render();
      const s = spec(S.pick), v = savings(s);
      announce(s.name + " picked: " + money(s.price) + " a year. " + (v.year > 0 ? "Saves " + money(v.year) + " a year and " + money(v.term) + " over the term, compared with the renewal quote."
        : v.year < 0 ? "Costs " + money(-v.year) + " a year more than the renewal quote, " + money(-v.term) + " over the term." : "Same price as the renewal quote."));
    } else if (t.name === "try-moss") {
      S.moss = Number(t.value);
      render();
      const s = spec("moss"), v = savings(s);
      announce("Mossgate for " + s.term + " months: " + money(s.price) + " a year. " + (v.year > 0 ? "Saves " + money(v.year) + " a year, " + money(v.term) + " over the term."
        : v.year < 0 ? "Costs " + money(-v.year) + " a year more than the renewal quote." : "Same price as the renewal quote."));
    } else if (t.name === "try-qmode") {
      numsUI.draft.mode = t.value;
      render();
    }
  });
  app.addEventListener("submit", (e) => {
    if (e.target.id !== "try-nums-form") return;
    e.preventDefault();
    const r = checkNums(numsUI.draft);
    const bad = ["today", "pct", "quote", "alt"].filter((k) => r.errs[k]);
    if (bad.length) {
      numsUI.errs = r.errs;
      render({ focus: "num-" + bad[0] });
      announce("Check the numbers: " + r.errs[bad[0]]);
      return;
    }
    if (r.val.mode === "pct") r.val.quote = Math.round(r.val.today * (1 + r.val.pct / 100));
    NUM = r.val;
    numsUI = freshNumsUI();
    numsChanged();
    render({ focus: "nums-toggle" });
    announce(numsSummary());
  });
  app.addEventListener("input", (e) => {
    const k = e.target.getAttribute && e.target.getAttribute("data-num");
    if (k && numsUI.draft) numsUI.draft[k] = e.target.value;
    if (e.target.id === "try-nudge-note") S.nudgeNote = e.target.value;
    if (e.target.id === "try-appr-note") S.apprNote = e.target.value;
  });
  app.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.nudgeOpen) {
      S.nudgeOpen = false;
      render();
      const nb = main.querySelector(".nudge-btn");
      if (nb) nb.focus();
    }
  });

  reset();
  app.hidden = false;
  render();
})();
