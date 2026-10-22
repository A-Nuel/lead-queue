import io
import pandas as pd
import streamlit as st
from engine import inspect, draft
from industry import rank

st.set_page_config(page_title="Nuel Lead Intelligence",layout="wide")
st.title("NUEL // Lead Intelligence")
st.caption("Evidence-backed website research, industry hypotheses and human-reviewed outreach.")
tab1,tab2,tab3=st.tabs(["Industry research","Website inspector","Lead batch"])
with tab1:
    st.info("Scores are starting hypotheses, not measured market demand. Validate with actual replies and sales.")
    st.dataframe(pd.DataFrame(rank()),use_container_width=True)
with tab2:
    url=st.text_input("Public business website","https://example.com")
    name=st.text_input("Business name","there")
    if st.button("Inspect website"):
        try:
            report=inspect(url)
            st.session_state["report"]=report
            st.json(report)
            st.text_area("Draft — review before sending",draft(name,report),height=130)
        except Exception as e: st.error(f"Inspection failed: {e}")
with tab3:
    upload=st.file_uploader("Import CSV or XLSX with website/url column",type=["csv","xlsx"])
    if upload:
        frame=pd.read_csv(upload) if upload.name.lower().endswith(".csv") else pd.read_excel(upload)
        st.dataframe(frame.head(10))
        col=next((c for c in frame.columns if c.lower().strip() in ("website","url","website url")),None)
        if not col: st.warning("Include a website or url column.")
        elif st.button("Inspect up to 20 websites"):
            results=[]
            for _,row in frame.head(20).iterrows():
                record=row.to_dict()
                try:
                    report=inspect(row[col])
                    record.update({"research_score":report["score"],"research_evidence":", ".join(x["signal"] for x in report["evidence"]),"research_error":"","outreach_draft":draft(str(row.get("name",row.get("business","there"))),report)})
                except Exception as e: record["research_error"]=str(e)
                results.append(record)
            st.session_state["batch"]=pd.DataFrame(results)
        if "batch" in st.session_state:
            st.dataframe(st.session_state["batch"],use_container_width=True)
            st.download_button("Download researched leads",st.session_state["batch"].to_csv(index=False).encode(),"researched_leads.csv","text/csv")
