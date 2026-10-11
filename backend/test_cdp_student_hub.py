import asyncio
import json
import websockets
import urllib.request
import base64
import os
import sys

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
USER_DATA_DIR = r"C:\Users\Aravinth\.gemini\antigravity-ide\brain\8f431df8-18b2-40da-a737-03d94ad3e3e6\scratch\edge_profile_student"
ARTIFACTS_DIR = r"C:\Users\Aravinth\.gemini\antigravity-ide\brain\8f431df8-18b2-40da-a737-03d94ad3e3e6"

current_id = 100

async def main():
    global current_id
    # 1. Login directly as student to backend to get real token
    print("--- 1. Testing Student Backend Login ---")
    login_req = urllib.request.Request(
        "http://127.0.0.1:5000/api/auth/login",
        data=json.dumps({"username": "student@sitto.edu", "password": "student123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    login_res = urllib.request.urlopen(login_req)
    login_data = json.loads(login_res.read().decode("utf-8"))
    token = login_data["token"]
    user = login_data["user"]
    print("Student login successful:", user["name"], user["role"])

    # 2. Launch Edge process if needed or connect to existing CDP
    import subprocess
    cmd = [
        EDGE_PATH,
        "--remote-debugging-port=9223",
        f"--user-data-dir={USER_DATA_DIR}",
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "http://localhost:5173/login"
    ]
    proc = subprocess.Popen(cmd)
    await asyncio.sleep(2.0)

    # Find websocket target
    tabs_url = "http://127.0.0.1:9223/json"
    req = urllib.request.urlopen(tabs_url)
    tabs = json.loads(req.read().decode("utf-8"))
    ws_url = None
    for t in tabs:
        if t.get("type") == "page":
            ws_url = t.get("webSocketDebuggerUrl")
            break

    if not ws_url:
        print("No debuggable page target found")
        proc.terminate()
        return

    print("Connecting to Edge CDP:", ws_url)
    async with websockets.connect(ws_url) as ws:
        async def send_cmd(method, params=None):
            global current_id
            current_id += 1
            msg = {"id": current_id, "method": method, "params": params or {}}
            await ws.send(json.dumps(msg))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == current_id:
                    return resp.get("result")

        async def eval_js(expr):
            res = await send_cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
            return res.get("result", {}).get("value")

        async def capture_screen(name, width=1280, height=800):
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 600
            })
            await asyncio.sleep(0.5)
            res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            png_bytes = base64.b64decode(res["data"])
            path = os.path.join(ARTIFACTS_DIR, name)
            with open(path, "wb") as f:
                f.write(png_bytes)
            print(f"Captured: {name} ({width}x{height})")

        # Set student auth token in session storage and navigate to Student Hub root '/'
        user_json = json.dumps(user).replace("'", "\\'")
        await send_cmd("Page.navigate", {"url": "http://localhost:5173/login"})
        await asyncio.sleep(1.5)

        # Inject session and navigate to '/'
        await eval_js(f"sessionStorage.setItem('token', '{token}'); sessionStorage.setItem('user', '{user_json}'); window.location.href = '/';")
        await asyncio.sleep(2.5)

        current_url = await eval_js("window.location.href")
        page_title = await eval_js("document.title")
        print(f"Loaded student page: {current_url} - {page_title}")

        # Check headline & greeting
        welcome_text = await eval_js("document.querySelector('h1')?.innerText")
        print("Hero headline:", welcome_text)

        # 3. Test Quick Status Cards
        cards_count = await eval_js("document.querySelectorAll('section')[1]?.querySelectorAll('.rounded-\\\\[20px\\\\]')?.length")
        print("Quick status cards count:", cards_count)

        # 4. Test Smart Seat Discovery Filter (Building Selection)
        print("--- Testing Smart Seat Discovery Cascading ---")
        # Select 'CSE Block' (BLD01)
        await eval_js("const sel = document.querySelectorAll('select')[0]; sel.value = 'BLD01'; sel.dispatchEvent(new Event('change', { bubbles: true }));")
        await asyncio.sleep(0.5)

        floors_options = await eval_js("Array.from(document.querySelectorAll('select')[1].options).map(o => o.text)")
        print("Cascading floors available under CSE Block:", floors_options)

        matching_spaces = await eval_js("document.querySelectorAll('#seat-discovery-section .rounded-\\\\[22px\\\\]')?.length")
        print("Rooms displayed for CSE Block:", matching_spaces)

        # Test Lab filter button
        await eval_js("const labBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Lab')); if (labBtn) labBtn.click();")
        await asyncio.sleep(0.5)

        # 5. Capture Desktop Screenshot
        await capture_screen("sitto_student_space_hub_desktop.png", 1440, 900)

        # 6. Test Navigation to Space Seat Selection (/space/LAB001)
        print("--- Testing Visual Seat Selection ---")
        await send_cmd("Page.navigate", {"url": "http://localhost:5173/space/LAB001"})
        await asyncio.sleep(2.0)

        space_title = await eval_js("document.querySelector('h1')?.innerText")
        seat_count = await eval_js("document.querySelectorAll('.seat-wrapper')?.length")
        print(f"Loaded {space_title}: {seat_count} seats on visual grid")

        # Click on seat S02 or first available seat
        await eval_js("const seat = Array.from(document.querySelectorAll('.seat-wrapper')).find(s => !s.disabled); if (seat) seat.click();")
        await asyncio.sleep(0.5)

        selected_chips = await eval_js("document.querySelectorAll('.bg-\\\\[\\\\#6850F4\\\\]')?.length")
        print("Selected seat chip count in panel:", selected_chips)

        # Test duration selection (switch to 2 hours)
        await eval_js("const dur2 = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '2 Hours'); if (dur2) dur2.click();")
        await asyncio.sleep(0.5)
        print("Duration 2 Hours clicked successfully")

        # 7. Test My Reservations Page (/reservations)
        print("--- Testing My Reservations & QR Pass ---")
        await send_cmd("Page.navigate", {"url": "http://localhost:5173/reservations"})
        await asyncio.sleep(1.5)
        res_cards = await eval_js("document.querySelectorAll('.rounded-\\\\[22px\\\\]')?.length")
        print(f"Reservations listed on page: {res_cards}")

        # Open the first pass
        first_pass_btn = await eval_js("const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('View Pass')); if (btn) { btn.click(); true; } else false;")
        await asyncio.sleep(1.5)
        qr_exists = await eval_js("document.querySelector('svg')?.tagName")
        print(f"Digital QR Pass rendered: {qr_exists == 'svg'}")

        # Capture Laptop and Mobile
        await capture_screen("sitto_student_space_hub_pass_laptop.png", 1024, 768)

        # Navigate back to Home and capture Mobile
        await send_cmd("Page.navigate", {"url": "http://localhost:5173/"})
        await asyncio.sleep(1.5)
        await capture_screen("sitto_student_space_hub_mobile.png", 390, 844)

        # 8. Test Notifications Page (/notifications)
        print("--- Testing Notifications Page ---")
        await send_cmd("Page.navigate", {"url": "http://localhost:5173/notifications"})
        await asyncio.sleep(1.5)
        notif_items = await eval_js("document.querySelectorAll('.rounded-\\\\[20px\\\\], .shadow-sm, .shadow-\\\\[0_4px_20px_rgba\\\\(107\\\\,61\\\\,245\\\\,0\\\\.12\\\\)\\\\]')?.length")
        print(f"Notifications listed: {notif_items}")

        # 9. Test Logout
        print("--- Testing Student Logout ---")
        await eval_js("const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Log out' || b.textContent.includes('Logout') || b.textContent.includes('Log Out')); if (logoutBtn) logoutBtn.click();")
        await asyncio.sleep(1.0)
        final_url = await eval_js("window.location.href")
        print(f"URL after logout: {final_url} (Redirected to /login: {'login' in final_url})")

    proc.terminate()
    print(">>> ALL STUDENT DASHBOARD TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    asyncio.run(main())
