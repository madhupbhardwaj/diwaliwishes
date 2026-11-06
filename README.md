# Diwali Wishes

Static site (no build step). Each greeting is just a URL:

- `/aarav/deepawali`, `/aarav/lantern`, `/aarav/doors`, `/aarav/midnight` — opens with "Aarav wishes you a Happy Diwali"
- `?m=your+message` adds a personal line
- `/` is the page where people type their name, pick a style and copy/share the link

## Deploy on Vercel
Upload all files (not the folder) to a GitHub repo and import it in Vercel.
`vercel.json` and `404.html` make any `/name/style` path load the site.

## Name subdomains (aarav.yourdomain.com)
1. Buy a domain, add it to the Vercel project, and add the wildcard `*.yourdomain.com`.
2. Set `BASE_DOMAIN = 'yourdomain.com'` at the top of `app.js`.
3. `https://aarav.yourdomain.com/doors` now greets "Aarav".

## Run locally
Any static server that falls back to `index.html`, e.g. `npx serve -s .`
