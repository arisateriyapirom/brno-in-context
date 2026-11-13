# Brno in Context

A static website exploring Brno through livability data and everyday life.

## Pages

- `index.html` — Home
- `brno-livability.html` — Livability map and relative rental costs
- `life-in-brno.html` — Photo/video journal
- `contacts.html` — Contact and portfolio links

## Uploading to GitHub

Keep the root HTML, CSS and JavaScript files, `data/`, and `vendor/` together,
with their current paths. These contain the files needed by the live website.
No build step is needed; `index.html` is the default entry page.

**Do not upload `_local-only/`.** It contains raw data, Excel and QGIS files,
analysis scripts, tests, audit outputs and unused original media. `.gitignore`
excludes this folder when using Git. If uploading through GitHub's website,
manually leave it out—drag-and-drop uploads do not apply `.gitignore` filtering.

The remaining `data/` files are used by the live site, including the walking
routing graph and tree tiles, which load on demand. Do not omit them.
Keep `vendor/` and its license files as well.

For local preview, run `python3 -m http.server 8000` here and open
`http://localhost:8000/`. Data requests require HTTP(S), rather than opening
HTML directly with `file://`.

## Mobile layout

At widths of 760 px or less, navigation collapses into a menu and the livability
map uses an expandable bottom panel. Search, factors, priorities and map details
open in separate panels. Select an area, then use “Compare with another area”
to compare two places. Journal photos support swiping and use smaller image
files on phones. Wider screens retain the desktop layout and original photos.

## Local source archive

`_local-only/README.md` explains the archive and how to restore files for
analysis or QGIS work. All original files were preserved. The website works
without the archive, but keep a separate backup of it for future data updates.

## Sources

Geographic and amenity data: [Brno public data](https://gis.brno.cz/ost/edas/public/)
and [OpenStreetMap](https://www.openstreetmap.org/copyright).
Rental snapshot: [Czech Ministry of Finance](https://mf.gov.cz/cs/rozpoctova-politika/podpora-projektoveho-rizeni/cenova-mapa/cenova-mapa-infografika).
Globe geometry: [Natural Earth](https://www.naturalearthdata.com/).
The map's “About the data” panel describes the methods and limitations.

## Residential accessibility

The livability page defaults to **Residential access**, with the original
**Land area** view available above the map. Score overlays still start off.
Residential mode uses KAM Brno's 2018–2020 housing-floor-area data and estimated
internal building origins on the existing walking network. It is not population
coverage or verified entrance routing. The derived north-aligned grid (approximately 250 m cells) and cadastral
summaries are in `data/residential/` and must be uploaded with the site, together
with `residential-access.js` and `residential-access.css`.

Residential overall includes ten walking-access factors, including access to parks
and cycling routes within a 500 m walk. Trees remain cadastral greenness context
outside that overall; rental cost also remains at cadastral scale. Switching views changes the score definition, not
just its map resolution. Social-service coverage in residential mode is an
absolute share rather than a score rescaled against the best area.

The original GeoPackage, building-level audit, reproducible analysis and QGIS
point output remain in `_local-only/`. See
`_local-only/analysis/RESIDENTIAL.md` for assumptions and reproduction.

## Stories and neighbourhood context

`journal-data.js` is the shared catalogue for Life in Brno and the livability
page. Edit story text, images, categories and mapped visit locations there.
Stories describe visits and activities, not residential experience across every
neighbourhood. Undocumented areas are not scored lower.

The Location tab shows saved walking estimates to transit, parks and groceries,
plus the area's rental-cost band. These are calculated from the mapped visit
location, not from residential grid averages. To regenerate them after changing
story locations, routing data or rental data, run:

```sh
node _local-only/analysis/export_journal_context.cjs
```

Upload `journal-data.js`, `story-links.js`, `story-links.css` and
`data/journal-context.json` alongside the updated pages/scripts. The journal uses
the small saved context file, avoiding a full network download just to open a
story. Missing or changed locations show an unavailable message until rebuilt.
Deep links use `?story=<entry-id>`: the journal opens the story, and the livability
map selects its area and places a walking-start pin at its mapped location.

Optional `observations` in each `journal-data.js` entry appear in the **Visit Notes**
tab: `visitDate`, `visitTime`, `cost`, `comfort` (seating, shade and
shelter), `walking`, and `suitedTo` (personal impression). Fill in the quoted
strings and leave unknown details empty. Empty fields are hidden; an empty tab says that no notes have been added yet. Notes do not change map scores; editing them does not require
regenerating `journal-context.json`.
