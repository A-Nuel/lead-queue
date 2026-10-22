import pandas as pd
import streamlit as st
from engine import inspect, draft
from industry import rank
from discovery import discover
from llm import analyze
from crm import upsert, list_leads, update, STAGES

st.set_page_config(page_title="Nuel Lead Intelligence",layout="wide")
st.markdown("""<style>
:root {color-scheme:dark}
.stApp {background:#080d16;color:#e7edf7}
[data-testid="stHeader"] {background:#080d16}
.block-container {max-width:1400px;padding-top:2.4rem}
h1,h2,h3 {font-family:Inter,system-ui,sans-serif;letter-spacing:-.035em}
h1 {font-weight:760;color:#f5f8ff}
[data-testid="stMetric"] {background:#111b2a;border:1px solid #253449;border-radius:12px;padding:18px}
.stTabs [data-baseweb="tab-list"] {gap:8px;border-bottom:1px solid #24354a}
.stTabs [data-baseweb="tab"] {background:#101a29;border-radius:8px 8px 0 0;padding:10px 16px;color:#c4d3e5}
.stTabs [aria-selected="true"] {background:#173550;color:#70d9e5}
.stButton button[kind="primary"] {background:#19b6c8;color:#06131c;border:0}
div[data-testid="stAlert"] {border-radius:10px}
</style>""",unsafe_allow_html=True)
st.caption("RESEARCH OPERATIONS  /  NUEL INTELLIGENCE")
st.title("Lead Intelligence")
st.markdown("Find the right businesses. Verify the evidence. Start better conversations.")
st.divider()
st.caption("UK prospect discovery, evidence-based research and human-reviewed sales outreach. No automatic messaging.")
tabs=st.tabs(["Dashboard / CRM","Industry research","Discover businesses","Website research","Import & batch"])

with tabs[0]:
    st.subheader("Sales pipeline")
    data=list_leads()
    st.metric("Leads stored",len(data))\n    st.caption("Research data is not proof of buying intent. Review all drafts and verify contact eligibility.")
    if not data.empty:
        st.dataframe(data,use_container_width=True)
        st.download_button("Export CRM",data.to_csv(index=False),"nuel_leads.csv")
        with st.form("status"):
            lead_id=st.selectbox("Lead",data["id"].tolist(),format_func=lambda n: data.loc[data.id==n,"business"].iloc[0])
            stage=st.selectbox("Stage",STAGES)
            notes=st.text_area("Notes / follow-up details")
            if st.form_submit_button("Save stage"):
                update(lead_id,stage,notes)
                st.success("Saved. Refresh to view updated data.")
with tabs[1]:
    st.info("Heuristic hypotheses, NOT verified market demand. Validate against outreach response and paid deals.")
    st.dataframe(pd.DataFrame(rank()),use_container_width=True)
with tabs[2]:
    st.caption("OpenStreetMap/Overpass data © OpenStreetMap contributors (ODbL). Listings can be sparse or stale.")
    city=st.text_input("UK city","Manchester")
    industry=st.selectbox("Industry",["Cleaning","HVAC","Plumbing","Property management","Landscaping","Recruitment agencies"])
    limit=st.slider("Maximum results",5,100,25,5)
    if st.button("Discover businesses"):
        try:
            results=discover(city,industry,limit)
            st.session_state["discovered"]=results
        except Exception as exc: st.error(f"Discovery failed: {exc}")
    if "discovered" in st.session_state:
        st.dataframe(pd.DataFrame(st.session_state["discovered"]),use_container_width=True)
        if st.button("Save discovered businesses to CRM"):
            upsert(st.session_state["discovered"])
            st.success("Saved. Check the CRM tab.")
with tabs[3]:
    url=st.text_input("Public business website","https://example.com")
    name=st.text_input("Business name","there")
    provider=st.selectbox("Analysis provider",["auto","zai","openrouter","nvidia","siliconflow","dashscope","deepseek","gemini","rules"],index=0)
    if st.button("Inspect website"):
        try:
            report=inspect(url)
            st.json(report)
            result=analyze(name,report,provider)
            st.json(result)
            st.text_area("Outreach draft — review before sending",result.get("outreach_draft",draft(name,report)),height=140)
        except Exception as exc: st.error(f"Inspection failed: {exc}")
with tabs[4]:
    upload=st.file_uploader("CSV or XLSX with a website or url column",type=["csv","xlsx"])
    if upload:
        frame=pd.read_csv(upload) if upload.name.lower().endswith(".csv") else pd.read_excel(upload)
        st.dataframe(frame.head(10),use_container_width=True)
        col=next((c for c in frame.columns if c.lower().strip() in ("website","url","website url")),None)
        if not col: st.warning("Add a website or url column.")
        elif st.button("Inspect up to 20 websites"):
            results=[]
            for _,row in frame.head(20).iterrows():
                record=row.to_dict()
                try:
                    report=inspect(row[col])
                    record.update({"research_score":report["score"],"research_evidence":", ".join(x["signal"] for x in report["evidence"]),"research_error":"",
                    "outreach_draft":draft(str(row.get("name",row.get("business","there"))),report)})
                except Exception as exc: record["research_error"]=str(exc)
                results.append(record)
            st.session_state["batch"]=pd.DataFrame(results)
        if "batch" in st.session_state:
            st.dataframe(st.session_state["batch"],use_container_width=True)
            st.download_button("Download researched leads",st.session_state["batch"].to_csv(index=False).encode(),"researched_leads.csv","text/csv")
