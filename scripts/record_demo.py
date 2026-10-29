"""Records a captioned screen demo of Scam Pause (no sound) to docs/demo.webm.
The captions follow VIDEO_SCRIPT.md, so a voice-over can be laid on top.
Run: python3 scripts/record_demo.py   (needs playwright and Chrome, like browser_check.py)
Then: ffmpeg -i docs/demo.webm -c:v libx264 -pix_fmt yuv420p -crf 23 docs/demo-captioned.mp4
"""
import asyncio, functools, http.server, os, shutil, socketserver, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"

CAPTION_JS = """(t) => {
  let c = document.getElementById('cap');
  if (!c) { c = document.createElement('div'); c.id = 'cap';
    Object.assign(c.style, {position:'fixed',left:'50%',bottom:'26px',transform:'translateX(-50%)',maxWidth:'1040px',width:'calc(100% - 80px)',
      background:'rgba(1,20,60,.94)',color:'#fff',font:'600 24px/1.35 system-ui,sans-serif',padding:'14px 22px',borderRadius:'14px',
      border:'1px solid #e8b4b4',zIndex:99999,textAlign:'center',boxShadow:'0 10px 30px rgba(0,0,0,.45)'});
    document.body.appendChild(c); }
  c.textContent = t; c.style.display = t ? 'block' : 'none';
}"""

async def main():
    httpd, url = serve()
    async with async_playwright() as p:
        chrome = shutil.which("google-chrome")
        b = await (p.chromium.launch(executable_path=chrome, args=["--disable-gpu", "--disable-dev-shm-usage"]) if chrome else p.chromium.launch())
        ctx = await b.new_context(viewport={"width": 1280, "height": 720}, record_video_dir=f"{ROOT}/docs/_video", record_video_size={"width": 1280, "height": 720}, bypass_csp=True)
        pg = await ctx.new_page()
        cap = lambda t: pg.evaluate(CAPTION_JS, t)
        wait = pg.wait_for_timeout
        scroll = lambda sel, off=0: pg.evaluate(f"(() => {{ const e = document.querySelector({sel!r}); window.scrollTo({{top: e.getBoundingClientRect().top + scrollY - 20 + {off}, behavior: 'smooth'}}); }})()")
        top = lambda: pg.evaluate("window.scrollTo({top: 0, behavior: 'smooth'})")
        await pg.goto(url + "?speed=40"); await pg.wait_for_selector("body[data-ready]"); await wait(600)
        await cap("In 2025, Canadians reported $704 million lost to fraud. The Anti-Fraud Centre thinks only 5 to 10% of fraud is ever reported."); await wait(7500)
        await cap("Most scams win in the same moment: someone wants money, a code or your card, and they want it right now."); await wait(6500)
        await cap("Scam Pause is for that moment, for older adults, newcomers and the family who look out for them."); await wait(6000)
        await pg.hover(".lock"); await cap("It runs on your device and keeps nothing you paste. A security policy stops the page from sending anything anywhere."); await wait(6500)
        await cap("Here is a made up call from a \"bank fraud department\"."); await wait(3500)
        await pg.click("[data-sample='Bank fraud call']"); await wait(1200)
        await cap("Stop. It names the scam: the bank investigator scam, and says honestly that no app can be certain from words alone."); await wait(7500)
        await scroll("#story"); await wait(600)
        await cap("It says what usually happens next, and how to check safely: hang up and call the number on the back of your card."); await wait(7000)
        await scroll(".grid2", -10); await wait(700)
        await cap("Every warning sign is in plain words, with the words that triggered it and the Canadian source behind it."); await wait(7000)
        await cap("A real bank never asks you to move money to a safe account, keep it from your branch, or stay on the line."); await wait(6500)
        await scroll(".actions"); await wait(500)
        await pg.click("#pauseBtn"); await wait(900)
        await cap("Then it buys time. The Anti-Fraud Centre suggests hanging up and waiting ten minutes before calling your bank back."); await wait(7000)
        await cap("The ten minute pause comes with a checklist. It is sped up here for the video."); await wait(6000)
        await pg.click("#ck0"); await wait(500); await pg.click("#ck1"); await wait(500); await pg.click("#ck2"); await wait(900)
        await pg.wait_for_selector("body[data-pause-done]", timeout=30000); await scroll("#pauseDone", -300); await wait(500)
        await cap("If it was real, it is still real after ten minutes. Scams can't wait. That is the point."); await wait(5500)
        await pg.click("#askBtn"); await wait(700)
        await cap("Ask someone you trust. A second person breaks the spell."); await wait(4000)
        await pg.type("#tName", "Priya", delay=90); await pg.type("#tPhone", "416 555 0100", delay=60); await wait(600)
        await scroll("#tMsg", -60); await wait(500)
        await cap("The message is written for you, with links, codes and card numbers taken out so it is safe to forward. Text or call them in one tap."); await wait(8000)
        await top(); await wait(600)
        await pg.click("#tabCall"); await wait(600)
        await cap("On a call, there's no text to paste. Answer three quick questions instead."); await wait(4500)
        await pg.select_option("#q-who", "cra"); await wait(500)
        await pg.check("input[name=pay][value=giftcards]"); await wait(400)
        await pg.check("input[name=ask][value=threat]"); await wait(400); await pg.check("input[name=ask][value=urgent]"); await wait(600)
        await pg.click("#checkBtn"); await wait(1200)
        await cap("The CRA does not take gift cards and does not threaten arrest. Scam Pause says so, with the CRA's own page as the source."); await wait(7500)
        await top(); await wait(500); await pg.click("#tabMsg"); await wait(300)
        await pg.click("[data-sample='Parcel on hold text']"); await wait(1200); await scroll(".grid2", -10); await wait(600)
        await cap("Links are checked without opening them: lookalike names, disguised letters and unusual endings."); await wait(6500)
        await top(); await wait(500)
        await pg.click("[data-sample='A real bank alert']"); await wait(1200)
        await cap("A real bank alert gets no warnings. Even then it says plainly that this doesn't prove a message is safe."); await wait(7000)
        await pg.click("#sentBtn"); await wait(900)
        await cap("Already sent money? Clear steps, in order: your bank first, then the police and the Canadian Anti-Fraud Centre."); await wait(7000)
        await pg.click("details.about summary"); await scroll("details.about"); await wait(800)
        await cap("Plain rules, no AI model, works offline. Tested on 96 made up messages, including 24 written after the rules were frozen."); await wait(7500)
        await cap("And it is clear about its limits: it reads words, not voices, and it is not an emergency service."); await wait(6000)
        await top(); await wait(700)
        await cap("Scam Pause. Before you send money, pause. Made by John Khan in Toronto, Ontario."); await wait(5500)
        path = await pg.video.path()
        await ctx.close(); await b.close()
    httpd.shutdown()
    os.replace(path, f"{ROOT}/docs/demo.webm")
    shutil.rmtree(f"{ROOT}/docs/_video", ignore_errors=True)
    print("saved docs/demo.webm")

asyncio.run(main())
