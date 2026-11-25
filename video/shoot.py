"""Screenshot the TriageBot demo page + slides for the demo video.

Real screenshots of the working demo page (Playwright + local Chromium).
No faked product shots: the Rovo slide is an explicitly labelled mockup.
"""
import sys
from pathlib import Path

sys.path.insert(0, "/home/hatch/pw-venv/lib/python3.12/site-packages")
sys.path.insert(0, "/home/hatch/pw-venv/lib/python3.11/site-packages")
from playwright.sync_api import sync_playwright

BASE = Path("/home/hatch/workspace/competitions/codegeist-2026/triage-agent")
SHOT = BASE / "video" / "screenshots"
CHROME = "/home/hatch/chromium-dl/chrome-linux/chrome"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.goto(f"file://{BASE}/demo/index.html")
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(SHOT / "01-home.png"))
    # ranked table
    pg.locator("table").first.scroll_into_view_if_needed()
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOT / "02-ranked.png"))
    # expand first draft reply
    pg.locator("details summary").first.click()
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOT / "03-draft.png"))
    # duplicate groups card
    pg.locator("h3", has_text="Duplicate groups").scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOT / "04-duplicates.png"))
    # stress set: 24 issues
    pg.locator("#btn-large").click()
    pg.wait_for_timeout(600)
    pg.locator("table").first.scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOT / "05-stress.png"))
    # slides
    pg.goto(f"file://{BASE}/video/slides/cover.html")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOT / "00-cover.png"))
    pg.goto(f"file://{BASE}/video/slides/rovo-mockup.html")
    pg.wait_for_timeout(400)
    pg.screenshot(path=str(SHOT / "06-rovo-mockup.png"))
    b.close()
print("shots done:", sorted(x.name for x in SHOT.glob("*.png")))
