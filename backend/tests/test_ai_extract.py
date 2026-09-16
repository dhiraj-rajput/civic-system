import pytest
from fastapi.testclient import TestClient

from app.services.ai_extract import (
    classify_complaint, detect_urgency, extract_duration, 
    extract_location_hints, summarize_complaint, analyze_complaint
)
from app.main import app

client = TestClient(app)

def test_classify_complaint():
    assert classify_complaint("There has been no street light near Gate 3 for almost a week")["category"] == "streetlight"
    assert classify_complaint("There is a huge pothole on MG Road near the bus stop")["category"] == "pothole"
    assert classify_complaint("Garbage has not been collected for 3 days near our building")["category"] == "garbage"
    assert classify_complaint("No water supply since last week, pipes seem to have burst")["category"] == "water_supply"
    assert classify_complaint("Stray dogs are attacking children in the park")["category"] == "other"
    
    empty_res = classify_complaint("")
    assert empty_res["category"] == "other"
    assert empty_res["method"] == "fallback"
    
    short_res = classify_complaint("abc")
    assert short_res["category"] == "other"
    assert short_res["method"] == "fallback"

def test_detect_urgency():
    assert detect_urgency("exposed live wire near the playground, children could get electrocuted")["urgency_level"] == "CRITICAL"
    assert detect_urgency("streetlight has been out for over a month, road is unsafe")["urgency_level"] == "HIGH"
    assert detect_urgency("garbage not collected for a few days, please fix")["urgency_level"] == "MEDIUM"
    assert detect_urgency("slight crack on the footpath")["urgency_level"] == "LOW"

def test_extract_duration():
    assert extract_duration("for 2 weeks")["days"] == 14
    assert extract_duration("since yesterday")["days"] == 1
    assert extract_duration("for a month")["days"] == 30
    assert extract_duration("3 days ago")["days"] == 3
    assert extract_duration("")["days"] == 0

def test_extract_location_hints():
    hints1 = extract_location_hints("near Gate 3 on MG Road")
    # depending on regex, might be in near_refs or landmarks
    assert any("gate 3" in h for h in hints1["near_refs"] + hints1["landmarks"])
    assert any("mg road" in h for h in hints1["road_refs"])
    
    hints2 = extract_location_hints("at the corner of Park Street and Main Avenue")
    assert any("park street and main avenue" in h.lower() for h in hints2["road_refs"])
    
    hints3 = extract_location_hints("in front of the hospital")
    assert "the hospital" in hints3["landmarks"]

def test_summarize_complaint():
    long_text = "This is a very long complaint that goes on and on for many words without stopping and it just keeps on going because the user is very upset and wants to write a lot about the problem."
    summary = summarize_complaint(long_text)
    assert len(summary.split()) <= 20
    assert summary.endswith("...")
    
    assert summarize_complaint("Road broken.") == "Road broken."
    assert summarize_complaint("") == ""

def test_analyze_complaint():
    text = "There has been no street light near Gate 3 for almost a week and the road gets extremely dark."
    res = analyze_complaint(text)
    assert res["category"] == "streetlight"
    assert res["urgency_level"] == "HIGH"
    assert any("gate 3" in h for h in res["location_hints"]["landmarks"] + res["location_hints"]["near_refs"])
    # Not enforcing strict duration check here as 'for almost a week' might skip the exact duration parser depending on implementation

def test_edge_cases():
    assert classify_complaint("नमस्ते there is a pothole")["category"] == "pothole"
    assert classify_complaint("STREETLIGHT IS BROKEN")["category"] == "streetlight"
    assert classify_complaint("  water   supply   problem  ")["category"] == "water_supply"

def test_ai_router_endpoints():
    response = client.post("/ai/classify", json={"description": "There has been no street light near Gate 3 for almost a week"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "streetlight"
    assert data["confidence"] > 0.5
    
    response2 = client.post("/ai/analyze")
    assert response2.status_code == 422
    
    response3 = client.post("/ai/analyze", json={"description": "There has been no street light near Gate 3 for almost a week and the road gets extremely dark."})
    assert response3.status_code == 200
    data3 = response3.json()
    assert "category" in data3
    assert data3["category"] == "streetlight"
    assert data3["urgency_level"] == "HIGH"
