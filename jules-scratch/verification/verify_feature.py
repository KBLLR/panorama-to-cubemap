from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")
    page.get_by_placeholder("A beautiful sunset over the ocean").fill("A beautiful sunset over the ocean")
    page.get_by_role("button", name="Generate").click()
    page.wait_for_selector("#faces > a", timeout=120000)
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()