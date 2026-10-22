"""OpenStreetMap Overpass business discovery; public OSM data with attribution."""
import requests

ENDPOINT="https://overpass.kumi.systems/api/interpreter"
TAGS={
 "Cleaning":"cleaning", "HVAC":"hvac", "Plumbing":"plumber",
 "Property management":"estate_agent", "Landscaping":"gardener",
 "Recruitment agencies":"employment_agency"
}
def discover(city,industry,limit=30):
    if industry not in TAGS: raise ValueError("Unsupported industry")
    if not city or len(city)>80 or any(c in city for c in '";<>'): raise ValueError("Invalid city")
    limit=max(1,min(int(limit),100))
    # Geocoding uses OSM Nominatim. One request per manual action; cache before production use.
    geo=requests.get("https://nominatim.openstreetmap.org/search",params={"q":city+", United Kingdom","format":"json","limit":1},
        headers={"User-Agent":"NuelLeadIntelligence/0.2 (business-research; contact: developer@example.invalid)"},timeout=15)
    geo.raise_for_status()
    places=geo.json()
    if not places: return []
    box=places[0]["boundingbox"]
    south,north,west,east=map(float,box)
    tag=TAGS[industry]
    query=f'[out:json][timeout:20];(nwr["craft"="{tag}"]({south},{west},{north},{east});nwr["office"="{tag}"]({south},{west},{north},{east}););out center {limit};'
    resp=requests.post(ENDPOINT,data={"data":query},timeout=30)
    resp.raise_for_status()
    found=[]
    for e in resp.json().get("elements",[]):
        t=e.get("tags",{})
        if not t.get("name"): continue
        found.append({"business":t["name"],"industry":industry,"city":city,
                      "website":t.get("website",t.get("contact:website","")),
                      "phone":t.get("phone",t.get("contact:phone","")),
                      "source":f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
                      "verification":"OSM listing; independently verify contact and business status"})
    return found[:limit]
