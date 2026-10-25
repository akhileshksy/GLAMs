# Sangrah — a directory of GLAMs in India

An open, community-maintained directory of **galleries, libraries, archives and museums** across India. Plain HTML, CSS and JavaScript, so it runs on GitHub Pages with no build step.

**Features:** full-text search, filter by type and state, sort, card/list views, a map that follows your filters, detail dialogs, CSV export, dark mode, and shareable URLs (`#type=museum&state=Kerala&q=bronze`).

## Publish on GitHub Pages

1. Create a repository (e.g. `glam-india`) and push these files to `main`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**. The included workflow validates the data and deploys on every push.
3. Replace `YOUR-USERNAME/glam-india` with your repo in `assets/app.js` (`REPO` constant) and in `index.html`.
4. Your site will be at `https://YOUR-USERNAME.github.io/glam-india/`.

Prefer no Actions? Choose **Deploy from a branch → main / (root)** instead. The `.nojekyll` file is already included.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly will not work, because browsers block `fetch` on `file://`.)

## Data

All records are in [`data/glams.json`](data/glams.json):

```json
{
  "id": "unique-kebab-case-id",
  "name": "Institution name",
  "type": "museum | library | archive | gallery",
  "also": ["library"],
  "city": "City",
  "state": "State or UT",
  "lat": 0.0, "lng": 0.0,
  "year": 1900,
  "summary": "One or two plain sentences.",
  "url": "https://official-site (or empty string)",
  "tags": ["topic", "topic"]
}
```

`also` and `year` are optional. Coordinates should be within India; they only need to be accurate to the neighbourhood.

### Accuracy note

The starting set was compiled from general knowledge of well-known institutions. Coordinates are approximate, some dates are the commonly cited founding or opening year, and **every entry should be checked against the institution's own site before being treated as authoritative**. Entries with an empty `url` are ones where an official link still needs to be confirmed. Corrections are very welcome.

## Contributing

- Use the **Add or correct an institution** issue form, or
- Edit `data/glams.json` and open a pull request. The workflow checks IDs, types and coordinates.
- Please cite a source for new entries and corrections.

## Ideas for next steps

- Add images (`"image"` field, with licence and credit) for each institution.
- Add fields for opening hours, ticketing, accessibility, and collections focus.
- Add opening of digital collections / OPAC / finding-aid links.
- Add a link checker action that runs monthly and opens an issue for dead URLs.
- Add Hindi and other-language labels.

## Licence

Data: CC0 1.0. Code: MIT (see `LICENSE`). Map tiles © OpenStreetMap contributors.
