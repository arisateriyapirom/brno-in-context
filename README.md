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
