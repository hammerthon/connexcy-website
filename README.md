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
The forms are set up for **Netlify Forms**. Deploy on Netlify and submissions show up in
the Netlify dashboard (Forms tab) with timestamps; turn on email notifications there.
To use another service (Formspree, HubSpot, etc.), put its URL in `FORM_ENDPOINT` in `assets/main.js`.
When you open the site locally, forms only pretend to send (they log to the browser console).

The "Top 10 Vendor Renewal Mistakes" guide itself still needs to be written. Send it from
Netlify's notification email or your email tool.

## Deploy
1. Drag the `connexy-site` folder onto https://app.netlify.com/drop (or connect a Git repo).
2. In Netlify, add the custom domain `connexcy.com` and follow its DNS instructions.
3. Submit `https://connexcy.com/sitemap.xml` in Google Search Console.
