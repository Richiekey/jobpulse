import httpx
import re

r = httpx.get("https://static.jobright.ai/_next/static/chunks/pages/jobs/info/%5Bid%5D-314f2eeb038b0049.js")
for m in re.finditer(r'Apply', r.text):
    st = max(0, m.start() - 150)
    en = min(len(r.text), m.end() + 150)
    print("--- [id] snippet ---")
    print(r.text[st:en])
