from fastapi.testclient import TestClient
from src.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] in ("healthy", "degraded")

def test_detect_ats_endpoint():
    with TestClient(app) as client:
        response = client.post("/api/detect-ats", json={"url": "https://boards.greenhouse.io/stripe/jobs/123"})
        assert response.status_code == 200
        data = response.json()
        assert data["ats"] == "GREENHOUSE"
        assert data["identifier"] == "stripe"
        assert data["job_id"] == "123"
        assert data["supported"] is True

def test_export_endpoints():
    with TestClient(app) as client:
        response_csv = client.get("/api/export/csv")
        assert response_csv.status_code == 200
        assert "Title,Company,Location" in response_csv.text

        response_json = client.get("/api/export/json")
        assert response_json.status_code == 200
        assert response_json.headers["content-type"] == "application/json"
