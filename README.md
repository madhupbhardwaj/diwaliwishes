# Diwali Wishes

Static site (no build step). Each greeting is just a URL:

- `/aarav/lantern`, `/aarav/doors`, `/aarav/midnight` — opens with "Aarav wishes you a Happy Diwali"
- `?m=your+message` adds a personal line
- `/` is the page where people type their name, pick a style and copy/share the link

## Deploy on Vercel
```
npm i -g vercel
vercel --prod
```
`vercel.json` rewrites every non-file path to `index.html`, which reads the name from the URL.

## Name subdomains (aarav.yourdomain.com)
1. Buy a domain, add it to the Vercel project, and add the wildcard `*.yourdomain.com`.
2. Set `BASE_DOMAIN = 'yourdomain.com'` at the top of `app.js`.
3. `https://aarav.yourdomain.com/doors` now greets "Aarav".

## Run locally
Any static server that falls back to `index.html`, e.g. `npx serve -s .`
