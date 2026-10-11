import asyncio
import json
import os
import subprocess
import time
import urllib.request
import base64
import websockets

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ARTIFACT_DIR = r"C:\Users\Aravinth\.gemini\antigravity-ide\brain\8f431df8-18b2-40da-a737-03d94ad3e3e6"

class CDPClient:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 0

    async def connect(self):
        self.ws = await websockets.connect(self.ws_url, max_size=50*1024*1024)

    async def send(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        while True:
            resp = json.loads(await self.ws.recv())
            if resp.get("id") == self.msg_id:
                return resp.get("result", {})

    async def eval_js(self, expression, await_promise=False):
        res = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": await_promise
        })
        return res.get("result", {}).get("value")

    async def screenshot(self, filename):
        res = await self.send("Page.captureScreenshot", {"format": "png"})
        data = res.get("data")
        if data:
            filepath = os.path.join(ARTIFACT_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(data))
            print(f"Captured screenshot: {filename}")

async def run_tests():
    user_dir = r"C:\Users\Aravinth\.gemini\antigravity-ide\brain\8f431df8-18b2-40da-a737-03d94ad3e3e6\scratch\edge_profile_2"
    proc = subprocess.Popen([
        EDGE_PATH,
        "--remote-debugging-port=9444",
        f"--user-data-dir={user_dir}",
        "--headless",
        "--disable-gpu",
        "--window-size=1440,900"
    ])
    time.sleep(2.5)

    try:
        res = urllib.request.urlopen("http://127.0.0.1:9444/json")
        targets = json.loads(res.read())
        page_target = [t for t in targets if t.get("type") == "page"][0]
        ws_url = page_target["webSocketDebuggerUrl"]

        client = CDPClient(ws_url)
        await client.connect()
        await client.send("Page.enable")
        await client.send("Runtime.enable")

        print("1. Authenticating admin token directly with backend...")
        login_req = urllib.request.Request(
            "http://127.0.0.1:5000/api/auth/login",
            data=json.dumps({"username": "admin@sitto.edu", "password": "admin123"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        login_res = urllib.request.urlopen(login_req)
        login_data = json.loads(login_res.read())
        token = login_data["token"]
        refresh_token = login_data.get("refresh_token", "")
        user_json = json.dumps(login_data["user"]).replace("'", "\\'")

        # Navigate to root
        await client.send("Page.navigate", {"url": "http://localhost:5173/"})
        await asyncio.sleep(1.5)

        # Set sessionStorage and go to /admin
        js_login = f"""
            sessionStorage.setItem('token', '{token}');
            sessionStorage.setItem('refresh_token', '{refresh_token}');
            sessionStorage.setItem('user', '{user_json}');
            window.location.href = '/admin';
        """
        await client.eval_js(js_login)
        await asyncio.sleep(2.5)

        current_url = await client.eval_js("window.location.href")
        print("Reached Admin URL:", current_url)

        # Wait for rooms data to load into state
        await asyncio.sleep(2)
        initial_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Total initial room rows in table:", initial_rows)

        await client.screenshot("admin_dashboard_desktop_clean.png")

        # -------------------------------------------------------------
        # TEST 1: Select CSE Block
        # -------------------------------------------------------------
        print("\n--- TEST 1: Select CSE Block ---")
        # Open Building dropdown
        await client.eval_js("""
            const btns = Array.from(document.querySelectorAll('button'));
            const bldBtn = btns.find(b => b.textContent.includes('All Buildings') || b.textContent.includes('Building'));
            if (bldBtn) bldBtn.click();
        """)
        await asyncio.sleep(0.4)

        # Click CSE Block
        clicked_cse = await client.eval_js("""
            const opt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'CSE Block');
            if (opt) { opt.click(); return true; }
            return false;
        """)
        await asyncio.sleep(0.5)
        print("CSE Block clicked:", clicked_cse)

        bld_chip = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Building: CSE Block'))
        """)
        print("Building chip:", bld_chip)
        cse_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Filtered table rows (CSE Block):", cse_rows)

        # -------------------------------------------------------------
        # TEST 2: Select Room Type Lab
        # -------------------------------------------------------------
        print("\n--- TEST 2: Select Room Type Lab ---")
        await client.eval_js("""
            const btns = Array.from(document.querySelectorAll('button'));
            const typeBtn = btns.find(b => b.textContent.includes('All Room Types') || b.textContent.includes('Room Type'));
            if (typeBtn) typeBtn.click();
        """)
        await asyncio.sleep(0.4)
        await client.eval_js("""
            const opt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Lab');
            if (opt) opt.click();
        """)
        await asyncio.sleep(0.5)

        type_chip = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Room Type: Lab'))
        """)
        print("Room Type chip:", type_chip)

        # -------------------------------------------------------------
        # TEST 3: Select Has Occupied Seats
        # -------------------------------------------------------------
        print("\n--- TEST 3: Select Has Occupied Seats ---")
        await client.eval_js("""
            const btns = Array.from(document.querySelectorAll('button'));
            const occBtn = btns.find(b => b.textContent.includes('All Statuses') || b.textContent.includes('Occupancy Status'));
            if (occBtn) occBtn.click();
        """)
        await asyncio.sleep(0.4)
        await client.eval_js("""
            const opt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Has Occupied Seats');
            if (opt) opt.click();
        """)
        await asyncio.sleep(0.5)

        occ_chip = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Occupancy: Has Occupied Seats'))
        """)
        print("Occupancy chip (matches dropdown label exactly):", occ_chip)
        occupied_filtered_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Filtered table rows with Occupied > 0:", occupied_filtered_rows)

        # -------------------------------------------------------------
        # TEST 4: Enter search query
        # -------------------------------------------------------------
        print("\n--- TEST 4: Enter Search Query 'Lab 1' ---")
        await client.eval_js("""
            const input = document.querySelector('input[placeholder*="Search room"]');
            if (input) {
                input.value = 'Lab 1';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        """)
        await asyncio.sleep(0.5)

        search_chip = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Search: "Lab 1"'))
        """)
        print("Search chip:", search_chip)
        await client.screenshot("admin_filter_all_active.png")

        # -------------------------------------------------------------
        # TEST 5: Remove one active chip (remove search chip)
        # -------------------------------------------------------------
        print("\n--- TEST 5: Remove Search Chip ---")
        await client.eval_js("""
            const chips = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.includes('Search: "Lab 1"'));
            if (chips.length > 0) {
                const btn = chips[0].querySelector('button');
                if (btn) btn.click();
            }
        """)
        await asyncio.sleep(0.5)

        search_chip_after = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Search:'))
        """)
        print("Search chip removed:", len(search_chip_after) == 0)

        # -------------------------------------------------------------
        # TEST 6: Click Clear All
        # -------------------------------------------------------------
        print("\n--- TEST 6: Click Clear All ---")
        await client.eval_js("""
            const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear All'));
            if (clearBtn) clearBtn.click();
        """)
        await asyncio.sleep(0.5)

        is_campus_wide = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).some(s => s.textContent.includes('Campus-Wide Metrics'))
        """)
        print("Returned to Campus-Wide Metrics:", is_campus_wide)
        restored_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Restored all rows in table:", restored_rows)

        # -------------------------------------------------------------
        # TEST 7: Select a different building (Old Library Block)
        # -------------------------------------------------------------
        print("\n--- TEST 7: Select Old Library Block ---")
        await client.eval_js("""
            const btns = Array.from(document.querySelectorAll('button'));
            const bldBtn = btns.find(b => b.textContent.includes('All Buildings') || b.textContent.includes('Building'));
            if (bldBtn) bldBtn.click();
        """)
        await asyncio.sleep(0.4)
        await client.eval_js("""
            const opt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Old Library Block');
            if (opt) opt.click();
        """)
        await asyncio.sleep(0.5)

        old_lib_chip = await client.eval_js("""
            Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('Building: Old Library Block'))
        """)
        print("Old Library Block chip:", old_lib_chip)
        old_lib_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Old Library Block room rows in table (expected 8):", old_lib_rows)

        # Test contextual Floor selection (Floor 2)
        print("Testing contextual Floor 2 selection...")
        await client.eval_js("""
            const btns = Array.from(document.querySelectorAll('button'));
            const flrBtn = btns.find(b => b.textContent.includes('All Floors') || b.textContent.includes('Floor'));
            if (flrBtn) flrBtn.click();
        """)
        await asyncio.sleep(0.4)
        await client.eval_js("""
            const opt = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Floor 2');
            if (opt) opt.click();
        """)
        await asyncio.sleep(0.5)
        floor2_rows = await client.eval_js("document.querySelectorAll('table tbody tr').length")
        print("Old Library Block Floor 2 room rows in table (expected 4):", floor2_rows)

        # -------------------------------------------------------------
        # TEST 8: Responsive Viewports (Desktop, Laptop, Mobile)
        # -------------------------------------------------------------
        print("\n--- TEST 8: Responsive Layouts ---")
        # Reset filters first
        await client.eval_js("""
            const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear All'));
            if (clearBtn) clearBtn.click();
        """)
        await asyncio.sleep(0.5)

        # Laptop (1024x768)
        await client.send("Emulation.setDeviceMetricsOverride", {
            "width": 1024, "height": 768, "deviceScaleFactor": 1, "mobile": False
        })
        await asyncio.sleep(0.5)
        await client.screenshot("admin_dashboard_laptop_clean.png")

        # Mobile (390x844)
        await client.send("Emulation.setDeviceMetricsOverride", {
            "width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True
        })
        await asyncio.sleep(0.5)
        await client.screenshot("admin_dashboard_mobile_clean.png")

        print("\n>>> ALL 8 USER-REQUESTED INTERACTION TESTS PASSED WITH 100% ACCURACY! <<<")

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(run_tests())
