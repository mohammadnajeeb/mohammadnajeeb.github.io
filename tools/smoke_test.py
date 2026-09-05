#!/usr/bin/env python3
"""Drive the built site in headless Chrome and assert the workbench works.

    python3 -m http.server 8765 &
    python3 tools/smoke_test.py [port]
"""
import html
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = sys.argv[1] if len(sys.argv) > 1 else "8765"
TMP = os.path.join(ROOT, "_test.html")


def main():
    if not os.path.exists(CHROME):
        sys.exit("Chrome not found at " + CHROME)
    script = open(os.path.join(ROOT, "tools", "testdata", "smoke.js.html"), encoding="utf-8").read()
    page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    open(TMP, "w", encoding="utf-8").write(page.replace("</body>", script + "\n</body>"))
    try:
        out = subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--window-size=1400,900",
             "--virtual-time-budget=15000", "--dump-dom",
             f"http://localhost:{PORT}/_test.html"],
            capture_output=True, text=True, timeout=90).stdout
    finally:
        if os.path.exists(TMP):
            os.remove(TMP)
    m = re.search(r'<pre id="testout">(.*?)</pre>', out, re.S)
    if not m:
        sys.exit("no test output — is the server running on port " + PORT + "?")
    report = html.unescape(m.group(1))
    print(report)
    sys.exit(1 if re.search(r"\b[1-9]\d* failed", report) else 0)


if __name__ == "__main__":
    main()
