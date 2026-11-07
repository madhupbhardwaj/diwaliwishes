# Diwali Wishes

Each greeting is just a URL:

- `/aarav/deepawali`, `/aarav/lantern`, `/aarav/doors`, `/aarav/midnight` — opens with "Aarav wishes you a Happy Diwali"
- `?m=your+message` adds a personal line
- `/` is the page where people type their name, pick a style and copy/share the link

## Files
- `index.html`, `404.html`, `app.js`, `styles.css` — the website (greetings, picture and video maker)
- `api/greet.js` — Vercel function that adds WhatsApp/iMessage link-preview tags per greeting
- `og/*.jpg` — the preview pictures (one per style, 1200×630)
- `vendor/mp4-muxer.min.js` — MIT-licensed helper (by Vanilagy) that packs the video into an MP4
- `vercel.json` — routes `/name/style` links to the preview function, cache settings

## Deploy on Vercel
Upload everything (keep the `api`, `og` and `vendor` folders) to a GitHub repo and import it in Vercel.
No build step or packages are needed.

## Name subdomains (aarav.yourdomain.com)
1. Buy a domain, add it to the Vercel project, and add the wildcard `*.yourdomain.com`.
2. Set `BASE_DOMAIN = 'yourdomain.com'` at the top of `app.js`.
