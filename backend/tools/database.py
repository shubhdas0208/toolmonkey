def db_lookup(record_id: int) -> dict:
    records = {
        1042: {"id": 1042, "email": "user1042@test.com", "name": "Test User", "status": "active"},
        77:   {"id": 77, "name": "Premium Widget", "price": 149.99, "stock": 42, "category": "widgets"},
    }
    if record_id in records:
        return {"status": "ok", "record": records[record_id]}
    return {"status": "not_found", "record": None}