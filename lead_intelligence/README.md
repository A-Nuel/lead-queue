# Nuel Lead Intelligence — V0.1

Independent, optional research module inside lead-queue. No changes to the existing app.

## Features
- Industry prioritization with explicitly subjective starting assumptions
- Website signal inspection with evidence URLs
- CSV/XLSX import, capped batch analysis, CSV export
- Human-reviewed outreach drafts
- No Google billing, scraping Google Maps, auto-DMs or paid LLM required

## Run
```bash
cd lead_intelligence
pip install -r requirements.txt
streamlit run app.py
```

## Caveats
- Only research public business websites you are permitted to access.
- Detection of a form/widget is not proof of a business problem. Missing widgets do not prove missing automation.
- Industry scores are hypotheses; validate against actual prospect conversations.
- No keys required. No CRM persistence yet; export results before closing.
- Network operations are synchronous and intentionally capped at 20.
- Do not deploy website inspection publicly without stronger SSRF defenses, DNS pinning and egress restrictions.
- Model integration is intentionally deferred: free OpenRouter routing can change, rate-limit, or become unavailable; never assume a guaranteed free tier.
