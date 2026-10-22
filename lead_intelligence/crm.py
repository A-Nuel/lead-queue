"""SQLite local CRM. No automated messaging."""
import sqlite3
from pathlib import Path
DB=Path(__file__).parent/"data"/"leads.sqlite3"
STAGES=("New","Researching","Qualified","Contacted","Replied","Interested","Demo","Proposal","Won","Lost","Do not contact")
def connect():
    DB.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(DB)
    db.execute("""CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY, business TEXT NOT NULL, industry TEXT, city TEXT,
      website TEXT, phone TEXT, source TEXT, evidence TEXT, score INTEGER DEFAULT 0,
      stage TEXT DEFAULT 'New', notes TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(business,city))""")
    db.commit()
    return db
def upsert(rows):
    with connect() as db:
        for r in rows:
            db.execute("""INSERT INTO leads(business,industry,city,website,phone,source,evidence,score)
            VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(business,city) DO UPDATE SET
            website=CASE WHEN excluded.website!='' THEN excluded.website ELSE leads.website END,
            phone=CASE WHEN excluded.phone!='' THEN excluded.phone ELSE leads.phone END,
            source=CASE WHEN excluded.source!='' THEN excluded.source ELSE leads.source END""",
            (r.get("business",""),r.get("industry",""),r.get("city",""),
             r.get("website",""),r.get("phone",""),r.get("source",""),
             r.get("evidence",""),int(r.get("score",0))))
def list_leads():
    import pandas as pd
    with connect() as db: return pd.read_sql_query("SELECT * FROM leads ORDER BY score DESC, id DESC",db)
def update(id,stage,notes):
    if stage not in STAGES: raise ValueError("Invalid stage")
    with connect() as db: db.execute("UPDATE leads SET stage=?, notes=? WHERE id=?",(stage,notes,int(id)))
