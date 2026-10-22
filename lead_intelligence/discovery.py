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
    # Predefined approximate city extents avoid the public Nominatim geocoding
    # endpoint, which is not suitable as a generic lead-generation backend.
    # Keep this list deliberately bounded; do not systematically harvest OSM.
    CITY_BOXES = {
        "birmingham": (52.38, -2.05, 52.57, -1.73),
        "manchester": (53.40, -2.33, 53.55, -2.15),
        "leeds": (53.73, -1.64, 53.87, -1.43),
        "liverpool": (53.34, -3.04, 53.48, -2.88),
        "bristol": (51.39, -2.68, 51.52, -2.50),
        "sheffield": (53.31, -1.55, 53.45, -1.39),
        "nottingham": (52.90, -1.23, 53.01, -1.10),
        "leicester": (52.58, -1.19, 52.68, -1.06),
        "coventry": (52.36, -1.57, 52.45, -1.44),
        "london": (51.45, -0.20, 51.55, -0.03),
    }
    key = city.strip().casefold()
    if key not in CITY_BOXES:
        raise ValueError("City not yet supported. Choose Birmingham, Manchester, Leeds, Liverpool, Bristol, Sheffield, Nottingham, Leicester, Coventry or London.")
    south,west,north,east = CITY_BOXES[key]
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
