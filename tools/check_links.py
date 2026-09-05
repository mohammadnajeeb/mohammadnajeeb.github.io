#!/usr/bin/env python3
"""Verify every local href/src in the generated HTML resolves to a real file,
and that every in-page #anchor matches a document id."""
import os, re, sys
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# content/ holds un-served HTML fragments; templates/ is source.
SKIP_DIRS = {".git", "_backup", "node_modules", "content", "templates"}

pages, bad, checked = [], [], 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if fn.endswith(".html"):
            pages.append(os.path.join(dirpath, fn))

for page in sorted(pages):
    src = open(page, encoding="utf-8").read()
    rel = os.path.relpath(page, ROOT)
    ids = set(re.findall(r'data-doc="([^"]+)"', src))
    ids |= set(re.findall(r'\sid="([^"]+)"', src))
    for attr, url in re.findall(r'(?:href|src)="([^"]*)"', src) and \
                     [("", u) for u in re.findall(r'(?:href|src)="([^"]*)"', src)]:
        u = url.strip()
        if not u or u.startswith(("http://", "https://", "mailto:", "data:", "tel:", "javascript:")):
            continue
        checked += 1
        if u.startswith("#"):
            frag = unquote(u[1:])
            if frag and frag not in ids:
                bad.append((rel, u, "anchor has no matching id/data-doc"))
            continue
        path, _, frag = u.partition("#")
        if not path:
            continue
        base = ROOT if path.startswith("/") else os.path.dirname(page)
        target = os.path.normpath(os.path.join(base, path.lstrip("/")))
        if not os.path.exists(target):
            bad.append((rel, u, "file not found"))

print(f"checked {checked} local references across {len(pages)} pages")
if bad:
    print(f"\n{len(bad)} BROKEN:")
    seen = set()
    for page, url, why in bad:
        k = (url, why)
        if k in seen:
            continue
        seen.add(k)
        n = sum(1 for b in bad if (b[1], b[2]) == k)
        print(f"  {url:<52} {why}  ({n}×, e.g. {page})")
    sys.exit(1)
print("no broken local links")
