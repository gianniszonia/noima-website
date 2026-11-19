# NÓIMA website

Website for **NÓIMA**, a data engineering, analytics and automation consultancy.
*Make sense of your data.* (Greek νόημα: meaning, sense.)

A single static page, with no build step: plain HTML, CSS and JavaScript.

## What's in it
- **Landing animation:** the logo appears scrambled, and as the symbol turns, the name and tagline arc into order. It then glides into the header.
- **Hero:** an interactive 3D model inspired by the Antikythera mechanism (Three.js r128). Drag to rotate, zoom with Ctrl+scroll, pinch or the buttons, and reset. A caption steps through the stages of data work as the gears turn.
- **Explorer:** a full-screen view of the mechanism. Take it apart, turn the crank, scrub time and name each part.
- **Themes:** dark (the default) and light, with a discreet sky of stars, constellations and orbits behind the page.
- **Sections:** Our name, What we do, How we work, Why NÓIMA, Tools (carousel), Founders, Contact.

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
| `privacy.html` | Privacy page (placeholder text). |
| `css/style.css` | All styles. Colour tokens for both themes are at the top. |
| `js/main.js` | Theme, landing animation, reveals, sky background, stage captions, carousel. It loads the 3D files at a quiet moment. |
| `js/mechanism.js` | The 3D model, the homepage interaction and the explorer. |
| `assets/brand/` | Logo files and favicons, copied unchanged from the brand package. |
| `assets/tools/` | Monochrome tool logos from [Simple Icons](https://simpleicons.org) (CC0; the trademarks belong to their owners). |

When `css/style.css`, `js/main.js` or `js/mechanism.js` changes, raise the `?v=` number on its links in `index.html` (and the 3D file list in `main.js`), so browsers fetch the new version.

## Status
Work in progress: the copy is a draft, and the contact address is a placeholder.
