import ipaddress, re, socket
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup

SIGNALS = {"form": ("form", 15), "booking": ("calendly|book now|schedule appointment|book online", 15), "whatsapp": ("wa.me|api.whatsapp.com", 10), "chat": ("intercom|tawk.to|crisp.chat|tidio", 10), "quote": ("get a quote|request a quote|free quote", 15)}
HEADERS = {"User-Agent": "NuelLeadResearch/0.1 (manual business website review)"}

def safe_url(value):
    value = str(value or "").strip()
    if not value: raise ValueError("Missing URL")
    if not value.startswith(("http://", "https://")): value = "https://" + value
    p = urlparse(value)
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password or p.port not in (None, 80, 443):
        raise ValueError("Unsupported URL")
    host = p.hostname.lower()
    if host == "localhost" or host.endswith((".local", ".internal", ".localhost")): raise ValueError("Private hostname")
    try:
        literal = ipaddress.ip_address(host)
        if not literal.is_global: raise ValueError("Non-public address")
    except ValueError as exc:
        # A ValueError from ip_address means this is a hostname; preserve our explicit rejection.
        if str(exc) == "Non-public address": raise
        try:
            addresses = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
        except OSError as dns_error:
            raise ValueError("Hostname could not be resolved safely") from dns_error
        if not addresses: raise ValueError("Hostname has no public addresses")
        for info in addresses:
            if not ipaddress.ip_address(info[4][0]).is_global:
                raise ValueError("Non-public address")
    return value

def inspect(url):
    url = safe_url(url)
    session = requests.Session()
    session.trust_env = False
    response = session.get(url, headers=HEADERS, timeout=12, allow_redirects=False)
    if response.status_code in (301,302,303,307,308):
        target = urljoin(url, response.headers.get("Location", ""))
        target = safe_url(target)
        response = session.get(target, headers=HEADERS, timeout=12, allow_redirects=False)
    response.raise_for_status()
    if "text/html" not in response.headers.get("Content-Type", ""): raise ValueError("Not HTML")
    if len(response.content) > 1_500_000: raise ValueError("Page too large")
    soup = BeautifulSoup(response.text, "html.parser")
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    content = soup.get_text(" ", strip=True).lower()[:150000]
    markup = str(soup).lower()[:250000]
    evidence = []
    for name, (pattern, weight) in SIGNALS.items():
        found = bool(soup.find("form")) if name == "form" else bool(re.search(pattern, markup if name in ("whatsapp","chat") else content + " " + markup))
        if found: evidence.append({"signal":name, "weight":weight, "url":response.url})
    score = min(100, 20 + sum(item["weight"] for item in evidence))
    return {"url":response.url,"title":title,"evidence":evidence,"score":score,"note":"Website signals only; no claim about internal operations."}

def draft(name, report, service="enquiry follow-up automation"):
    found = ", ".join(e["signal"] for e in report.get("evidence", [])) or "your website"
    return (f"Hi {name}, I was looking at your website and noticed {found}. "
            f"I help service businesses improve enquiry handling with {service}. "
            "Would you be open to a quick conversation about your current process?")
