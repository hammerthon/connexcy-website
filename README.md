# Connexcy.com website

A static site (plain HTML, CSS and JavaScript). No build step, no database to run.

## Pages
- `index.html`: Home (hero, dashboard preview, problems, how it works, features, savings calculator, free guide, testimonials, FAQ)
- `features.html`, `pricing.html`, `beta.html` (beta / demo form), `about.html`
- `privacy.html`, `terms.html`: placeholders, have an attorney review them before launch

## Editing
- Text: edit the HTML files directly.
- Prices: edit the numbers in `pricing.html` (Starter $49/mo, Growth $199/mo).
- Colors and fonts: the variables at the top of `assets/styles.css` (the "Electric blue" colors; `--logo-main` and `--logo-accent` color the logo).
- Testimonials: replace the `[placeholder]` cards on the home page and remove the "Placeholder" tags.
- LinkedIn link: in the footer of every page (`https://www.linkedin.com/`).
- Contact email: `hello@connexcy.com` throughout, plus `CONTACT_EMAIL` in `assets/main.js`.

## Logo and intro
- Logo ("Corner link", two documents joined at their folded corners): inline SVG in three places on each page (header,
  footer and intro), with the word "Connexcy" set in Inter Tight Bold. Image files made from it: `assets/favicon.svg`,
  `assets/favicon-32.png`, `assets/apple-touch-icon.png` and the social share image `assets/og-image.png` (1200 x 630).
  Remake them if the logo changes.
- Intro: the first page someone opens in a visit shows the logo for about a second, then fades into the page; a click, tap,
  key or scroll skips it. The pieces: the `.intro` block at the top of each page's `<body>`, its styles at the end of
  `assets/styles.css`, the one-line script and the `<noscript>` line (which also shows the fade-in sections when JavaScript is off) in each page's `<head>` (the script remembers per
  browser tab, and a tab opened from a link on the site counts as the same visit), and the intro code at the top of
  `assets/main.js`, which also removes it 3 seconds after the page shows (keep the CSS delay plus fade under that).
  To turn it off, delete those pieces.
- After changing `assets/styles.css`, `assets/main.js` or `assets/favicon.svg`, raise the `?v=` number where the pages link
  to them, so returning visitors get the new file instead of their cached copy.

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
