# Site backup — pre-VS Code rebuild

Snapshot of `mohammadnajeeb.github.io` exactly as it stood before the 2026 rebuild.

- **Taken:** 2026-09-05
- **Git commit at time of backup:** `6dd4a22` ("updates")
- **Contents:** the complete working tree minus `.git/` (54 files, ~10 MB)

## What was here

- `index.html`, `404.html` — Bootstrap/MDB single-column layout, teal `#005555` accent
- `pages/` — experience, projects, publications
- `blog/` — 21 posts + index (all migrated into `content/blog/` in the new site)
- `social/` — instagram.html (gallery script that cannot work on GitHub Pages),
  youtube.html (shipped with `VIDEO_ID_HERE` placeholder cards)
- `assets/` — main.css, 4 JS files (3 dead), the old resume PDF, the 1.94 MB profile photo
- `src/` — empty husk containing only a `.DS_Store`

## Restoring

```bash
# restore one file
cp _backup/pages/projects.html pages/projects.html

# restore everything (destructive — wipes the new site)
rsync -a --delete --exclude='_backup' _backup/ ./
```

Nothing here is referenced by the live site. `robots.txt` disallows `/_backup/`
and it is excluded from `sitemap.xml`.
