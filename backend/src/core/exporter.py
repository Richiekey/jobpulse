import csv
import json
import io
from typing import List, Dict, Any

EXPORT_COLUMNS = [
    ("Title", "title"),
    ("Company", "company_name"),
    ("Location", "location"),
    ("Remote Type", "remote_type"),
    ("Employment Type", "employment_type"),
    ("Department", "department"),
    ("Salary Min", "salary_min"),
    ("Salary Max", "salary_max"),
    ("Currency", "salary_currency"),
    ("Job URL", "job_url"),
    ("Apply URL", "apply_url"),
    ("Source", "source"),
    ("Posted At", "posted_at"),
]

def export_csv(jobs: List[Dict[str, Any]]) -> str:
    """Exports job list to CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([col[0] for col in EXPORT_COLUMNS])
    
    for job in jobs:
        row = []
        for _, key in EXPORT_COLUMNS:
            val = job.get(key)
            if val is None:
                row.append("")
            else:
                row.append(str(val))
        writer.writerow(row)
        
    return output.getvalue()

def export_json(jobs: List[Dict[str, Any]]) -> str:
    """Exports job list to JSON string."""
    # Convert any non-serializable objects (like datetime, UUID) to string
    def default_serializer(o):
        return str(o)
    return json.dumps(jobs, indent=2, default=default_serializer)
