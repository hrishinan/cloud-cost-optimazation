from app.services.recommendations import generate_demo_recommendations


def test_demo_recommendations_have_required_fields():
    items = generate_demo_recommendations()
    assert items
    for item in items:
        assert item["resource_id"]
        assert item["resource_type"]
        assert item["estimated_monthly_saving"] >= 0
        assert item["risk_level"] in {"low", "medium", "high"}
