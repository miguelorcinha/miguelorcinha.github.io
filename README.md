# miguelorcinha.github.io

Personal academic website of Miguel Reis Orcinha. It is plain HTML, CSS and JavaScript with no build step, and GitHub Pages serves it as it is.

## Where things live

| What | File |
|---|---|
| All the text (bio, affiliations, links, research topics) | `content/config.js` |
| Publications and talks | `bib/*.bib`, copied from the CV. Only entries with the `ORCINHA` keyword are shown. |
| Colours and fonts | the top of `assets/style.css` |
| Pages | `index.html` (home), `publications.html`, `talks.html`. The header bar and footer are shared and drawn by `assets/site.js`. |
| The code that reads the .bib files and draws the page | `assets/site.js` (you shouldn't need to touch it) |
| Images and PDFs | `images/`, `files/` |
| Logo (mark and name lockups, dark "midnight" and light "paper" versions) and favicons | `images/logo/`, `favicon.*`, `icon-*.png` at the top level |

## Common updates

- **A new paper or talk:** add it to the CV .bib file as usual, then copy the updated file over the one in `bib/`. It appears on the site automatically, sorted by date.
- **A paper is in the wrong research topic:** add its bib key to that topic's `include` or `exclude` list in `content/config.js`.
- **Use your own plot for a research topic:** put the image in `images/research/` and set `figure: "images/research/name.png"` for that topic in `content/config.js`.
- **Link to a filtered list:** `publications.html#modulation`, `#variability` or `#ams` opens the publications page filtered to that topic.
- **A new CV PDF:** put it in `files/` and update `cv:` in `content/config.js`.

Rules the site applies: proceedings are shown only when your name is in the author list, AMS Collaboration papers are hidden until the visitor turns them on, and the Talks page lists only talks where you are the first author, leaving out collaboration meetings.

## Preview on your computer

The page loads the .bib files, which browsers refuse to do from a file opened directly. Start a small local server in this folder instead:

```sh
cd ~/MY.Website
python3 -m http.server 8000
```

Then open http://localhost:8000 and press Ctrl-C in the terminal when you are done.

## Publish

```sh
git add -A && git commit -m "Update site" && git push
```

GitHub Pages updates https://miguelorcinha.github.io/ within a minute or two.
