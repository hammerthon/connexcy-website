# Connexcy.com website

A static site (plain HTML, CSS and JavaScript). No build step, no database to run.

## Pages
- `index.html`: Home (hero, dashboard preview, problems, how it works, features, savings calculator, free guide, testimonials, FAQ)
- `features.html`, `pricing.html`, `beta.html` (beta / demo form), `about.html`
- `privacy.html`, `terms.html`: placeholders, have an attorney review them before launch

## Editing
- Text: edit the HTML files directly.
- Prices: edit the numbers in `pricing.html` (Starter $49/mo, Growth $199/mo).
- Colors and fonts: the variables at the top of `assets/styles.css`.
- Testimonials: replace the `[placeholder]` cards on the home page and remove the "Placeholder" tags.
- LinkedIn link: in the footer of every page (`https://www.linkedin.com/`).
- Contact email: `hello@connexcy.com` throughout, plus `CONTACT_EMAIL` in `assets/main.js`.

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
