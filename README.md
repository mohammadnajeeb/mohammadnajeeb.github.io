# mohammadnajeeb.github.io

My portfolio, built as a Visual Studio Code window: file tree, editor tabs,
command palette, an interactive terminal, six colour themes.

**Live:** https://mohammadnajeeb.github.io

The site is generated. **Do not edit the HTML** — every `.html` file in the repo
is written by `tools/build.py` and will be overwritten. Edit the source in
`data/` and `content/`, then rebuild.

```bash
python3 tools/build.py          # regenerate every page + sitemap + search index
python3 -m http.server 8765     # then open http://localhost:8765
```

No dependencies — Python standard library only, no npm, no bundler.

## Layout

```
data/           source of truth (JSON)
  profile.json      name, headline, contact, links, languages, certifications
  experience.json   6 roles
  education.json    5 entries
  projects.json     11 projects
  skills.json       36 skills, grouped — rendered as the Extensions view
  publications.json
  blog.json         post index (title, date, tags, art, legacy filename)
  search-index.json GENERATED — do not edit
content/blog/   22 post bodies as HTML fragments
tools/
  build.py        the generator
  make_art.py     draws the 11 project + 8 blog SVG diagrams
  migrate_blog.py one-off import from the old site (already run)
  check_links.py  asserts no broken local links
  smoke_test.py   drives the workbench in headless Chrome (27 assertions)
assets/
  css/themes.css  6 themes as CSS custom properties
  css/ide.css     the workbench
  js/ide.js       tabs, tree, palette, search, terminal, themes
  img/projects/   architecture diagrams (SVG, theme-aware via var(--syn-*))
  img/blog/       8 reusable topic headers
_backup/        the pre-2026 site, kept for reference (excluded from robots.txt)
```

## Common edits

| Task | File |
|---|---|
| New job, or update a current one | `data/experience.json` |
| New project | `data/projects.json` + a drawing in `tools/make_art.py` |
| New blog post | `content/blog/<slug>.html` + an entry in `data/blog.json` |
| Change contact details or links | `data/profile.json` |
| Add a skill | `data/skills.json` |
| Change colours | `assets/css/themes.css` |

After any of these: `python3 tools/build.py`.

## Checks

```bash
python3 tools/check_links.py    # every local href/src resolves (2041 refs)
python3 tools/smoke_test.py     # needs the local server running
```

## Deploy

Pushing to `main` triggers `.github/workflows/static.yml`, which publishes the
repo root to GitHub Pages. Because the HTML is committed, **run the build before
you commit** or the deployed site will lag behind `data/`.

## Notes

- The old site is preserved in `_backup/` (see `_backup/BACKUP_NOTES.md`).
- Old blog URLs (`blog_post_*.html`) still resolve — the build emits a redirect
  stub for each one.
- Everything renders without JavaScript; the workbench is progressive
  enhancement, and the CSS unwraps it into a plain document if JS is off.
