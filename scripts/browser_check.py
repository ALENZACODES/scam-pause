"""Browser check for Scam Pause.

Serves the site, loads it in headless Chrome and checks:
  * a bank investigator message is stopped and named, with its signs and sources,
  * a phone call described with the quick questions is scored the same way,
  * a fake delivery link is caught as a lookalike,
  * a real bank alert is left alone, with honest wording,
  * the ten minute pause runs and ends (sped up with ?speed=),
  * the message to a trusted person leaves out codes and links,
  * nothing pasted is stored, and the page cannot reach any outside server,
  * there are no console errors.
With --shots it also saves the gallery screenshots into docs/.

Needs: pip install playwright, then either Chrome installed or `playwright install chromium`.
Run:  python3 scripts/browser_check.py [--shots]
"""
import asyncio, functools, http.server, os, shutil, socketserver, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = "--shots" in sys.argv

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"

async def main():
    httpd, url = serve()
    failures = []
    def check(ok, what):
        print(("PASS " if ok else "FAIL ") + what)
        if not ok: failures.append(what)
    async with async_playwright() as p:
        chrome = shutil.which("google-chrome")
        b = await (p.chromium.launch(executable_path=chrome, args=["--disable-gpu", "--disable-dev-shm-usage"]) if chrome else p.chromium.launch())
        ctx = await b.new_context(viewport={"width": 1400, "height": 960})
        pg = await ctx.new_page()
        async def shot(name, sel=None, up=16):
            if not SHOTS: return
            await pg.evaluate("document.querySelectorAll('.toast').forEach(t => t.remove())")
            if sel: await pg.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - {up})")
            else: await pg.evaluate("window.scrollTo(0,0)")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=f"{ROOT}/docs/{name}.png")
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(url + "?speed=120"); await pg.wait_for_selector("body[data-ready]")
        await pg.click("[data-sample='Bank fraud call']"); await pg.wait_for_timeout(400)
        check((await pg.get_attribute("body", "data-level")) == "stop", "bank investigator message: Stop")
        check("bank investigator" in await pg.inner_text("#story"), "the story is named, with what comes next")
        signs = await pg.inner_text("#signs")
        check("safe" in signs and "secret" in signs and "Canadian Anti-Fraud Centre" in signs, "signs explained with sources")
        check(await pg.locator("#marked mark").count() >= 4, "the words are highlighted in place")
        await shot("gallery-1-stop", "#result", 10)
        # Trusted person
        await pg.click("#askBtn"); await pg.fill("#tName", "Priya"); await pg.fill("#tPhone", "416 555 0100"); await pg.wait_for_timeout(200)
        msg = await pg.input_value("#tMsg")
        check(msg.startswith("Hi Priya") and "bank investigator" in msg, "trusted person message is written")
        check((await pg.get_attribute("#smsLink", "href")).startswith("sms:4165550100"), "text link goes to the trusted number")
        await shot("gallery-5-trusted", "#ask", 10)
        # Pause
        await pg.click("#pauseBtn"); await pg.wait_for_timeout(300)
        await shot("gallery-4-pause", "#pause", 10)
        await pg.wait_for_selector("body[data-pause-done]", timeout=15000)
        check("Ten minutes are up" in await pg.inner_text("#pauseDone"), "the pause runs and ends")
        # Delivery link
        await pg.evaluate("window.scrollTo(0,0)")
        await pg.click("[data-sample='Parcel on hold text']"); await pg.wait_for_timeout(400)
        links = await pg.inner_text("#linksBox")
        check("Borrows the name of Canada Post" in links and "Unusual ending" in links, "fake delivery link is caught")
        await shot("gallery-3-link", "#story", 10)
        # Real alert
        await pg.click("[data-sample='A real bank alert']"); await pg.wait_for_timeout(400)
        check((await pg.get_attribute("body", "data-level")) == "low" and "doesn't prove" in await pg.inner_text("#banner"), "real bank alert left alone, honestly")
        await shot("gallery-6-real", "#result", 10)
        # Call
        await pg.evaluate("window.scrollTo(0,0)")
        await pg.click("#tabCall"); await pg.select_option("#q-who", "cra")
        for v in ["giftcards"]: await pg.check(f"input[name=pay][value={v}]")
        for v in ["threat", "stayon", "urgent"]: await pg.check(f"input[name=ask][value={v}]")
        await shot("gallery-2-call", "#checkH", 30)
        await pg.click("#checkBtn"); await pg.wait_for_timeout(400)
        check((await pg.get_attribute("body", "data-level")) == "stop" and "CRA" in await pg.inner_text("#story"), "phone call questions: fake CRA call is stopped")
        if SHOTS:
            # put the result under the questions for the second gallery image
            await pg.evaluate("window.scrollTo(0, document.querySelector('#result').getBoundingClientRect().top + scrollY - 10)")
        # About
        await pg.click("details.about summary"); await pg.wait_for_timeout(200)
        about = await pg.inner_text("#about")
        check("13 of 14" in about and "What it cannot do" in about, "test results and limits are shown in the app")
        await shot("gallery-8-about", "details.about", 10)
        stored = await pg.evaluate("Object.keys(localStorage)")
        check(stored == ["scam-pause-trusted"], f"only the trusted contact is stored ({stored})")
        blocked = await pg.evaluate("""async () => { try { await fetch('https://example.com/collect', {method: 'POST', body: 'msg'}); return false } catch (e) { return true } }""")
        check(blocked, "network lock: a request to an outside server is blocked")
        errors = [e for e in errors if "Content Security Policy" not in e and "Refused to connect" not in e and "Failed to fetch" not in e]
        check(not errors, "no console errors" + (f": {errors}" if errors else ""))
        m = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = await m.new_page(); await mp.goto(url + "?example=Grandchild%20in%20trouble"); await mp.wait_for_selector("body[data-ready]"); await mp.wait_for_timeout(600)
        check(await mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "phone layout has no sideways scroll")
        check((await mp.get_attribute("body", "data-level")) == "stop", "grandparent text is stopped on a phone")
        if SHOTS:
            await mp.evaluate("window.scrollTo(0, document.querySelector('#result').getBoundingClientRect().top + scrollY - 8)"); await mp.wait_for_timeout(500)
            await mp.screenshot(path=f"{ROOT}/docs/gallery-7-phone.png")
        await b.close()
    httpd.shutdown()
    print(f"\n{'ALL PASSED' if not failures else str(len(failures)) + ' FAILED'}")
    sys.exit(1 if failures else 0)

asyncio.run(main())
