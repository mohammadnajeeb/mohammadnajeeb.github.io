#!/usr/bin/env python3
"""One-time migration: pull the 21 blog posts out of _backup/blog/*.html into
content/blog/<slug>.html fragments plus a data/blog.json index.

Run once. After that, edit content/blog/ directly and re-run tools/build.py.
"""
import html
import json
import os
import re
import unicodedata
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_backup", "blog")
OUT = os.path.join(ROOT, "content", "blog")

SKIP = {"index.html", "blog_post_najeeb.html", "posts"}

# Topic art is shared across posts so 21 posts need 8 drawings, not 21.
ART_RULES = [
    # Order matters: the most specific topic wins. Word boundaries stop "gene"
    # matching inside "generative" and "image" matching "docker image".
    (r"\bmcp\b|bioinformatic|\bncbi\b|\bgene\b|protocol|json-rpc",  "protocol"),
    (r"docker|container|\bci/?cd\b|mlops|deploy|\baws\b|azure|\bgcp\b|cloud|etl|pipeline", "pipeline"),
    (r"\brag\b|retrieval|vector|langchain|chatbot|embedding|semantic search", "retrieval"),
    (r"transformer|attention|\bgpt\b|\bllm\b|generative|distillation",  "transformer"),
    (r"computer vision|\bcnn\b|face recognition|\bclip\b|opencv|medical imag", "vision"),
    (r"dashboard|plotly|forecast|time.series|sarimax|analytic",       "analysis"),
    (r"usability|user-centered|human-computer|interaction design|\bux\b", "interaction"),
    (r"latex|overleaf|academic|integrity|universit|apply|germany|student|research paper", "academia"),
]


# Regex can only get you so far; these are set by hand.
ART_OVERRIDES = {
    "real-time-face-recognition-systems-with-opencv-and-deep-learning": "vision",
    "building-interactive-dashboards-with-plotly-and-dash": "analysis",
    "user-centered-design-conducting-effective-usability-studies": "interaction",
    "advancements-in-machine-learning-for-computer-vision": "vision",
    "revolutionizing-computer-vision-with-machine-learning": "vision",
    "zero-shot-learning-with-clip-for-medical-image-classification": "vision",
    "knowledge-distillation-for-edge-deployment-compressing-cnns-without-losing-accuracy": "transformer",
}


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return "-".join(text.split("-")[:10])


def pick_art(title, body):
    hay = (title + " " + body[:1200]).lower()
    for pattern, art in ART_RULES:
        if re.search(pattern, hay):
            return art
    return "transformer"


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def main():
    os.makedirs(OUT, exist_ok=True)
    index = []

    for name in sorted(os.listdir(SRC)):
        if name in SKIP or not name.endswith(".html"):
            continue
        raw = open(os.path.join(SRC, name), encoding="utf-8").read()

        m = re.search(r"<article>(.*?)</article>", raw, re.S)
        if not m:
            print(f"  !! no <article> in {name}, skipped")
            continue
        article = m.group(1)

        t = re.search(r"<h1>(.*?)</h1>", article, re.S)
        title = html.unescape(strip_tags(t.group(1))) if t else name

        d = re.search(r'<p class="text-muted">Published on (.*?)</p>', article)
        date_txt = d.group(1).strip() if d else "January 1, 2026"
        try:
            date_iso = datetime.strptime(date_txt, "%B %d, %Y").strftime("%Y-%m-%d")
        except ValueError:
            date_iso = "2026-01-01"

        # Drop the h1, the byline and the broken hero <img> — the shell renders those.
        body = article
        body = re.sub(r"<h1>.*?</h1>", "", body, flags=re.S)
        body = re.sub(r'<p class="text-muted">Published on.*?</p>', "", body, flags=re.S)
        body = re.sub(r"<img[^>]*>", "", body)
        body = re.sub(r"\n\s*\n+", "\n\n", body).strip()

        k = re.search(r'<meta name="keywords"\s+content="(.*?)"', raw, re.S)
        tags = [x.strip() for x in html.unescape(k.group(1)).split(",")][:5] if k else []

        first_p = re.search(r"<p>(.*?)</p>", body, re.S)
        excerpt = strip_tags(first_p.group(1))[:190] if first_p else ""
        if len(excerpt) == 190:
            excerpt = excerpt.rsplit(" ", 1)[0] + "…"

        slug = slugify(title)
        pinned = "pinned" in name

        open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8").write(body + "\n")
        index.append({
            "slug": slug,
            "title": title,
            "date": date_iso,
            "date_display": date_txt,
            "tags": tags,
            "excerpt": excerpt,
            "art": ART_OVERRIDES.get(slug, pick_art(title, body)),
            "pinned": pinned,
            "legacy": name,
            "words": len(strip_tags(body).split()),
        })

    index.sort(key=lambda p: (not p["pinned"], p["date"]), reverse=False)
    index.sort(key=lambda p: (p["pinned"], p["date"]), reverse=True)

    with open(os.path.join(ROOT, "data", "blog.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"migrated {len(index)} posts -> content/blog/ + data/blog.json")
    for p in index:
        print(f"  {'*' if p['pinned'] else ' '} {p['date']}  {p['art']:<12} {p['slug'][:46]:<48} ({p['words']}w)")


if __name__ == "__main__":
    main()
