# FORM — gym tracker with Frito & Ramona

Static PWA (`index.html`, `styles.css`, `app.js`, `sw.js`) plus `server.mjs`, a stdlib Node server that serves the files and keeps one JSON blob per tailnet user in `data/`. The user comes from the `Tailscale-User-Login` header that `tailscale serve` adds, so there is no login screen: everyone on the tailnet gets their own data.

## Run
```
node server.mjs              # http://127.0.0.1:4500 (user "local")
systemctl --user restart form-tracker   # the service unit
```
Tailnet URL: https://abhyuday-samadder-com.tail09c0ca.ts.net:8447 (set with `tailscale serve --bg --https=8447 http://127.0.0.1:4500`).

## Deploy a change
Edit files in place, then bump `CACHE` in `sw.js` so installed iPhones pick up the new version. The service does not need a restart for static files; restart it for `server.mjs` changes.

## Cats
`cats/*.webp` are the Pixar-style sprites generated in `~/cats-art` (see the Turnwise project). `icons/` are made from Ramona's face on pink.
