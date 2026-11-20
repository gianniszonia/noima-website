# NÓIMA website

Website for **NÓIMA**, a data engineering, analytics and automation consultancy.
*Make sense of your data.* (Greek νόημα: meaning, sense.)

A single static page, with no build step: plain HTML, CSS and JavaScript.

## What's in it
- **Landing animation:** the logo appears scrambled, and as the symbol turns, the name and tagline arc into order. It then glides into the header.
- **Hero:** from 1024 px wide, an interactive 3D model inspired by the Antikythera mechanism (Three.js r128): drag to rotate; a caption steps through twelve stages of data work as it turns, with a pause button. On narrower screens the hero shows a still image and the 3D files load only when the explorer is opened.
- **Explorer:** a full-screen view of the mechanism with two readings ("NÓIMA" and "How it worked"). Take it apart, turn the crank, scrub time, and read about each part.
- **Theme:** dark only for now, with a discreet sky of stars behind the page and, on wide screens, a few small networks in the side margins.
- **Sections:** What we do, How we work, Why NÓIMA (with the tools), Founders, Our name and symbol, Questions, Contact.

## Run it locally
Serve the folder with any static server. For example, with Python:

```
python -m http.server 8737
```

Then open http://localhost:8737.

## Files
| Path | What it is |
|---|---|
| `index.html` | The page. The landing, header and footer logos are inline SVG generated from the official brand files. |
| `privacy.html`, `404.html` | The privacy page and the "page not found" page. |
| `robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI assistants. Keep `llms.txt` and the structured data in `index.html` in step with the page. |
| `css/style.css`, `css/explorer.css` | The page's styles (design tokens at the top) and the explorer's. |
| `js/main.js` | Landing animation, menu, reveals, founder cards, the symbol, sky background, stage captions. It loads the 3D files after the landing (or when the explorer is opened on small screens). |
| `js/mechanism.js` | The 3D model, the homepage interaction and the explorer. |
| `assets/brand/` | Logo files and favicons, copied unchanged from the brand package. |
| `assets/tools/` | Monochrome tool logos from [Simple Icons](https://simpleicons.org) (CC0; the trademarks belong to their owners). |

When `css/style.css`, `css/explorer.css`, `js/main.js` or `js/mechanism.js` changes, raise the `?v=` number on its links in `index.html`, `privacy.html` and `404.html` (and, for `mechanism.js`, in the `THREE_FILES` list in `main.js`), so browsers fetch the new version.

## Status
Work in progress.
