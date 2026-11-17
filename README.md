# Connexcy.com website

A static site (plain HTML, CSS and JavaScript). No build step, no database to run.

## Pages
- `index.html`: Home (hero, dashboard preview, problems, how it works, features, savings calculator, free guide, testimonials, FAQ)
- `features.html`, `pricing.html`, `beta.html` (beta / demo form), `about.html`
- `try.html` (/try): the hands-on demo (no sign-up, made-up data), linked as "Try it" in every page's header and from the
  home page's `#try` section. It runs entirely in the browser (`assets/try.js`, `assets/try.css`; the data is at the top of
  `try.js`): no network calls, no cookies, nothing saved. Keep it to what the app really does.
- `privacy.html`, `terms.html`: placeholders, have an attorney review them before launch
- `industries/index.html` (all six industries) and one page per industry: `industries/saas.html`, `ecommerce.html`,
  `restaurants.html`, `healthcare.html`, `financial-services.html`, `professional-services.html` (see "Industries" below)

## Editing
- Text: edit the HTML files directly.
- Prices: edit the numbers in `pricing.html` (Free up to 10 contracts, Starter $99/mo, Growth $349/mo). The app has the same plans in `connexy-app/plans.py`, and Stripe has the prices: change all three together.
- Colors and fonts: the variables at the top of `assets/styles.css` (the "Electric blue" colors; `--logo-main` and `--logo-accent` color the logo).
- Testimonials: replace the `[placeholder]` cards on the home page and remove the "Placeholder" tags.
- LinkedIn link: in the footer of every page (`https://www.linkedin.com/company/connexcy/`).
- Contact email: `hello@connexcy.com` throughout, plus `CONTACT_EMAIL` in `assets/main.js`.

## Logo and intro
- Logo ("Corner link", two documents joined at their folded corners): inline SVG in the header, the footer and the intro
  of each page, with the word "Connexcy" set in Inter Tight Bold. Image files made from it: `assets/favicon.svg`,
  `assets/favicon-32.png`, `assets/apple-touch-icon.png` and the social share image `assets/og-image.png` (1200 x 630).
  Remake them if the logo changes.
- Home page intro (about 7 seconds): when a visit starts on the home page, a dark screen types "connexcy.com" into an
  address bar, the logo's two pages fly in and slam together, lines of light reach out to floating documents, and the
  screen splits open along its diagonal onto the page. "Tap for sound" plays the typing, chime and hits (browsers block
  sound until the visitor interacts; where a browser allows it, the sound starts by itself and the same button turns it
  off; iPhones before iOS 17 get no sound, since their silent switch would mute it). "Skip intro", a click or tap, a
  key, a scroll or a swipe ends it until the page shows (6.23 s); after that, clicks and keys go to the page. A skipped
  intro keeps taking clicks for half a second, so a double-click doesn't open a link underneath. A tab opened in the
  background holds the intro until it is first shown. The pieces: the `#cxi` block at the top of `index.html`'s
  `<body>` (the typed letters carry their own times, which `KEY_AT` in `intro.js` repeats); `assets/intro.css`, with
  the whole timeline at the top of the file; `assets/intro.js` (sound, skipping, clean-up; its times match the CSS); the sound file
  `assets/intro-sounds.m4a` (the same sounds as the TruePay intro); and the inline script in `index.html`'s `<head>`,
  which plays it once per browser tab, not when arriving from another page of the site, and never for reduced motion,
  high-contrast themes, blocked site storage or browsers too old to draw it (no CSS `atan2()`). Add `?intro` to the
  address to see it again (https://connexcy.com/?intro). Without JavaScript, or if `intro.css` doesn't load, the block
  stays hidden (it has the `hidden` attribute) and the page shows as normal. The page's header and hero are painted
  from the first frame under the intro (they land from opacity .01, not 0), so page-speed measurements stay fast.
- Intro on the other pages: the first page someone opens in a visit shows the logo for about a second, then fades into
  the page; a click, tap, key or scroll skips it. The pieces: the `.intro` block at the top of each page's `<body>`, its
  styles at the end of `assets/styles.css`, the one-line script and the `<noscript>` line (which also shows the fade-in
  sections when JavaScript is off) in each page's `<head>` (the script remembers per browser tab, and a tab opened from a
  link on the site counts as the same visit; it shares the memory with the home page's intro), and the intro code at the
  top of `assets/main.js`, which also removes it 3 seconds after the page shows (keep the CSS delay plus fade under that).
  To turn an intro off, delete its pieces.
- After changing `assets/styles.css`, `assets/main.js`, `assets/intro.css`, `assets/intro.js`, `assets/intro-sounds.m4a`
  or `assets/favicon.svg`, raise the `?v=` number where the pages (or `intro.js`, for the sound) link to them, so
  returning visitors get the new file instead of their cached copy.

## Explainer video
The home page's "See it in under 3 minutes" section (`#video`, linked from the hero) plays the 2:46 explainer:
`assets/connexcy-explainer.mp4` (1080p, about 28 MB, loaded only when someone presses play), its captions
`assets/connexcy-explainer.vtt`, and its poster `assets/connexcy-explainer-poster.jpg` (the film's logo frame, so the
"Watch the video" button sits below the tagline). The transcript under the video, the VideoObject data in the
page's `<head>` (its `duration`) and the length on the "Watch the video" button must match the video. The video is made in `/Users/hammer/connexcy-video` (see its README); after
re-rendering it there, copy `out/connexcy-explainer.mp4` and `out/captions.vtt` here under the names above, and
re-export the poster if the logo frame changed. The "Watch" button and its behaviour are in `assets/main.js` and the
"Explainer video" part of `assets/styles.css`; without JavaScript the video shows its normal controls.

## Industries
Every page's header has an "Industries" menu right after "Features" (a button that opens a panel on desktop; a
plain list in the mobile menu); its code is in `assets/main.js` and `assets/styles.css`, and its links are repeated
in each page's header, so change all of them together. The footer's Product column links to `industries/index.html`.
Pages inside `industries/` reach the rest of the site with `../`.

- Content: every figure, vendor, person, title and narration line on the industry pages comes from
  `/Users/hammer/connexcy-industry-videos/industries.json`, the same file the industry videos are made from, so the
  pages and the films match. Change the JSON first, then the pages. Each page shows the JSON's `disclaimer` under the
  video and under the walk-through. The pages claim only what the rest of the site claims (no compliance
  certifications for Connexcy).
- Videos: each page plays `assets/industries/<slug>.mp4` with captions `assets/industries/<slug>.vtt` and poster
  `assets/industries/<slug>-poster.jpg` (18 files for the six industries). They are made in
  `/Users/hammer/connexcy-industry-videos`; copy each render here under those names. The "Watch the video" button
  works the same way as the home page's.
- The transcript under each video (the JSON's `vo` lines, written for reading: figures instead of spoken numbers,
  connexcy.com instead of "Connexcy dot com") and the VideoObject `duration` in each page's `<head>` (a placeholder
  `PT1M` until the videos are rendered) must match that page's video.

## Forms (beta signups and guide requests)
Forms send to the Connexcy app at `https://app.connexcy.com/api/leads` (`FORM_ENDPOINT` in `assets/main.js`).
Submissions appear on the app's **Website leads** page and are emailed to `LEADS_NOTIFY_EMAIL`.
The forms only work once the app is online at app.connexcy.com.

The "Top 10 Vendor Renewal Mistakes" guide itself still needs to be written.

## Hosting
GitHub Pages serves this repo's `main` branch at https://connexcy.com (the `CNAME` file sets the domain).
Push a change and it's live in about a minute. DNS is at GoDaddy: four `A` records for `@` pointing to
185.199.108–111.153 and `www` as a `CNAME` to `hammerthon.github.io`.
Submit `https://connexcy.com/sitemap.xml` in Google Search Console.
