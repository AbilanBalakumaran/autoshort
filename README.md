# autoshort

Sukishort — générateur de shorts anime/manga (script IA → voix off → images →
montage → publication).

## Structure

```
pages/
  public/          front-end (source de vérité) — déployé sur Cloudflare Pages
  functions/       API Cloudflare Pages Functions (generate-prompt, generate-audio, …)
  wrangler.toml
worker/            worker Cloudflare (cron actus)
push-worker/       worker Cloudflare (notifications push)
index.html         ┐
script.js          │ copie miroir de pages/public, servie par GitHub Pages
style.css          │ (https://abilanbalakumaran.github.io/autoshort/)
sw.js              │
manifest.json …    ┘
```

> ⚠️ Les fichiers à la racine sont un **miroir** de `pages/public/` : les deux
> emplacements sont déployés (Cloudflare Pages sert aussi l'API, GitHub Pages
> ne sert que le front). Ne modifie que `pages/public/`, puis lance :
>
> ```sh
> ./sync-public.sh
> ```
>
> pour recopier le front à la racine. `./sync-public.sh --check` échoue si les
> deux copies ont divergé.

## Dev local

```sh
npx serve -l 5500 pages/public
```

À chaque déploiement qui touche `index.html`, `style.css`, `script.js` ou
`vendor/`, incrémente `CACHE_NAME` dans `sw.js` (voir le commentaire en tête du
fichier) pour que le service worker recharge les clients.
