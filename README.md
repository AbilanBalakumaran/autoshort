# autoshort

Sukishort — générateur de shorts anime/manga (script IA → voix off → images →
montage → publication).

## Structure

```
pages/
  public/          front-end (source unique)
  functions/       API Cloudflare Pages Functions (generate-prompt, generate-audio, …)
  wrangler.toml
worker/            worker Cloudflare (cron actus)
push-worker/       worker Cloudflare (notifications push)
.github/workflows/pages.yml   publie pages/public sur GitHub Pages
```

Le front est déployé deux fois, à partir du **même** dossier `pages/public` :

| URL | Sert | Déploiement |
| --- | --- | --- |
| `autoshort-2ym.pages.dev` | front + API (`pages/functions`) | GitHub Actions (`cloudflare.yml`) |
| `abilanbalakumaran.github.io/autoshort` | front seul | GitHub Actions (`pages.yml`) |

> ℹ️ Le projet Cloudflare Pages n'est pas relié au dépôt : un push sur `main`
> ne déclenche rien de son côté. `cloudflare.yml` s'en charge via
> `wrangler pages deploy`, et a besoin d'un secret de dépôt
> `CLOUDFLARE_API_TOKEN` (permission « Account · Cloudflare Pages · Edit »).
> Sans ce secret le job réussit sans rien déployer, et la mise en ligne doit
> alors se faire à la main :
>
> ```sh
> cd pages && npx wrangler pages deploy public --project-name=autoshort
> ```

> ℹ️ Pour que le workflow prenne le relais, régler une fois **Settings → Pages
> → Source** sur « GitHub Actions » (avant, GitHub Pages servait une copie
> miroir du front à la racine du dépôt ; elle a été supprimée).

## Police des sous-titres

`pages/public/fonts/ObelixProB-cyr-fr.ttf` est ObelixPro (© vallex, 2011,
`fsType = 8` — modification autorisée) complétée : la version d'origine ne
contenait aucune lettre accentuée, si bien que chaque é/è/à/ç d'un sous-titre
retombait sur Arial Black. `tools/extend-font.py` fabrique les glyphes
manquants à partir des formes que la police contient déjà (les traits du
double accent aigu, le caron de Š retourné en circonflexe, les points du Ÿ,
la cédille du Ş), puis les recombine avec les lettres de base :

```sh
python3 tools/extend-font.py <source.ttf> pages/public/fonts/ObelixProB-cyr-fr.ttf
```

## Dev local

```sh
npx serve -l 5500 pages/public
```

À chaque déploiement qui touche `index.html`, `style.css`, `script.js` ou
`vendor/`, incrémente `CACHE_NAME` dans `pages/public/sw.js` (voir le
commentaire en tête du fichier) pour que le service worker recharge les
clients ouverts.
