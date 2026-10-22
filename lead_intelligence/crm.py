"""Persistent PostgreSQL CRM when DATABASE_URL is configured; local SQLite otherwise."""
import os
import sqlite3
from pathlib import Path
import pandas as pd

DB = Path(__file__).parent / "data" / "leads.sqlite3"
STAGES = ("New", "Researching", "Qualified", "Contacted", "Replied", "Interested", "Demo", "Proposal", "Won", "Lost", "Do not contact")
COLUMNS = ("business", "industry", "city", "website", "phone", "source", "evidence", "score")

def is_postgres():
    return bool(os.getenv("DATABASE_URL", "").strip())

def connect():
    if is_postgres():
        import psycopg
        db = psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=12)
        with db.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS leads (
                id BIGSERIAL PRIMARY KEY, business TEXT NOT NULL, industry TEXT, city TEXT,
                website TEXT, phone TEXT, source TEXT, evidence TEXT, score INTEGER DEFAULT 0,
                stage TEXT DEFAULT 'New', notes TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(business, city))""")
        db.commit()
        return db
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB)
    db.execute("""CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY, business TEXT NOT NULL, industry TEXT, city TEXT,
        website TEXT, phone TEXT, source TEXT, evidence TEXT, score INTEGER DEFAULT 0,
        stage TEXT DEFAULT 'New', notes TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business, city))""")
    db.commit()
    return db

def upsert(rows):
    postgres = is_postgres()
    placeholders = ",".join(["%s" if postgres else "?"] * len(COLUMNS))
    sql = f"""INSERT INTO leads({','.join(COLUMNS)}) VALUES ({placeholders})
        ON CONFLICT(business,city) DO UPDATE SET
        website=CASE WHEN excluded.website!='' THEN excluded.website ELSE leads.website END,
        phone=CASE WHEN excluded.phone!='' THEN excluded.phone ELSE leads.phone END,
        source=CASE WHEN excluded.source!='' THEN excluded.source ELSE leads.source END"""
    with connect() as db:
        for r in rows:
            values = tuple(int(r.get(c, 0) or 0) if c == "score" else str(r.get(c, "") or "") for c in COLUMNS)
            db.execute(sql, values)

def list_leads():
    with connect() as db:
        if is_postgres():
            with db.cursor() as cur:
                cur.execute("SELECT * FROM leads ORDER BY score DESC, id DESC")
                return pd.DataFrame(cur.fetchall(), columns=[col.name for col in cur.description])
        return pd.read_sql_query("SELECT * FROM leads ORDER BY score DESC, id DESC", db)

def update(id, stage, notes):
    if stage not in STAGES:
        raise ValueError("Invalid stage")
    with connect() as db:
        db.execute("UPDATE leads SET stage=%s, notes=%s WHERE id=%s" if is_postgres()
                   else "UPDATE leads SET stage=?, notes=? WHERE id=?", (stage, notes, int(id)))
