"""Optional OpenAI-compatible analysis with a free-first, no-charge fallback."""
import json
import os
import requests

PROVIDERS = [
 ("zai", "https://api.z.ai/api/paas/v4/chat/completions", "ZAI_API_KEY", "glm-4.7-flash"),
 ("openrouter", "https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", "openrouter/free"),
 ("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "GEMINI_API_KEY", "gemini-2.5-flash"),
]
SYSTEM = ("You are a UK B2B lead analyst. Use ONLY provided evidence. "
          "Never invent company problems, decision makers, revenues, contact details or website features. "
          "Distinguish observed facts from unknowns. Reply in JSON with keys "
          "observations, unknowns, opportunity, discovery_question, outreach_draft, confidence. "
          "Outreach must be truthful and non-manipulative. No claims of proven lost revenue.")

def analyze(business, report, provider="zai"):
    if provider == "rules":
        return {"observations":[e["signal"] for e in report.get("evidence",[])],
                "unknowns":["Whether internal automation exists","Whether the owner wants help"],
                "opportunity":"Discuss enquiry handling and follow-up processes",
                "discovery_question":"How do you currently handle new enquiries?",
                "outreach_draft":f"Hello, I was researching {business} and wanted to ask how you handle new customer enquiries and follow-ups.",
                "confidence":"low","provider":"rules"}
    selection=next((p for p in PROVIDERS if p[0]==provider),None)
    if not selection: raise ValueError("Unknown provider")
    name,endpoint,env,model=selection
    key=os.getenv(env)
    if not key: return analyze(business,report,"rules") | {"fallback_reason":f"{env} not configured"}
    # Limit submitted data to research findings; no secrets or personal contact details.
    data={"business":business,"website":report.get("url"),"signals":report.get("evidence",[]),"title":report.get("title","")}
    try:
        res=requests.post(endpoint,headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"},
            json={"model":os.getenv(name.upper()+"_MODEL",model),"temperature":0.2,
                  "max_tokens":650,"messages":[{"role":"system","content":SYSTEM},
                  {"role":"user","content":json.dumps(data)}]},timeout=25)
        res.raise_for_status()
        raw=res.json()["choices"][0]["message"]["content"]
        try: parsed=json.loads(raw)
        except json.JSONDecodeError:
            start,end=raw.find("{"),raw.rfind("}")
            parsed=json.loads(raw[start:end+1])
        if not isinstance(parsed,dict) or not parsed.get("outreach_draft"): raise ValueError("Malformed model output")
        parsed["provider"]=name
        return parsed
    except (requests.RequestException,ValueError,KeyError,IndexError,TypeError) as exc:
        return analyze(business,report,"rules") | {"fallback_reason":str(exc)[:160]}
