import httpx
import re
import json

# Let's search all JS chunks of Jobright for endpoints related to apply, redirect, or job detail
manifest_url = "https://static.jobright.ai/_next/static/Uu2eR78ZFdEtp1QDLZ6sS/_buildManifest.js"
r = httpx.get(manifest_url)
print("Manifest status:", r.status_code)

# Let's find all chunks
chunks = re.findall(r'static/chunks/[^"]+\.js', r.text)
print(f"Found {len(chunks)} chunks in manifest")

keywords = ["/api/", "apply", "redirect", "originalUrl", "applyUrl", "atsUrl", "externalUrl", "sourceUrl", "greenhouse", "lever"]

found_endpoints = set()
for c in chunks:
    url = f"https://static.jobright.ai/_next/{c}"
    try:
        res = httpx.get(url, timeout=10)
        # Search for api paths
        apis = re.findall(r'["\'`](/(?:api|api-proxy|gateway)/[a-zA-Z0-9_\-\/]+)["\'`]', res.text)
        for api in apis:
            found_endpoints.add(api)
            
        for kw in ["applyUrl", "redirectUrl", "companyApplyUrl", "targetUrl", "jobUrl"]:
            if kw in res.text:
                for m in re.finditer(rf'{kw}[^,\}}]*', res.text):
                    print(f"[{c}] -> {m.group(0)[:80]}")
    except Exception as e:
        pass

print("\n--- ALL UNIQUE API ENDPOINTS FOUND ---")
for ep in sorted(found_endpoints):
    print(" ", ep)
