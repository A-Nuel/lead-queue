# Heuristic research prioritization, not verified market statistics.
INDUSTRIES = {
 "Cleaning": {"enquiry_frequency":4,"ticket_size":3,"automation_fit":5,"accessibility":5,"competition":3},
 "HVAC": {"enquiry_frequency":5,"ticket_size":5,"automation_fit":5,"accessibility":4,"competition":3},
 "Plumbing": {"enquiry_frequency":5,"ticket_size":4,"automation_fit":5,"accessibility":4,"competition":3},
 "Dental clinics": {"enquiry_frequency":4,"ticket_size":5,"automation_fit":4,"accessibility":2,"competition":4},
 "Property management": {"enquiry_frequency":4,"ticket_size":5,"automation_fit":5,"accessibility":3,"competition":4},
 "Landscaping": {"enquiry_frequency":4,"ticket_size":3,"automation_fit":4,"accessibility":5,"competition":3},
 "Recruitment agencies": {"enquiry_frequency":5,"ticket_size":5,"automation_fit":5,"accessibility":3,"competition":5}
}
def rank(weights=None):
    weights = weights or {"enquiry_frequency":3,"ticket_size":2,"automation_fit":3,"accessibility":3,"competition":-2}
    rows=[]
    for industry, values in INDUSTRIES.items():
        rows.append({"industry":industry,**values,"score":sum(values[k]*v for k,v in weights.items())})
    return sorted(rows,key=lambda r:r["score"],reverse=True)
