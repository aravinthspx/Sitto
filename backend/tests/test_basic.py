import pytest

def test_health_endpoint(client):
    rv = client.get('/health')
    assert rv.status_code == 200
    assert b'healthy' in rv.data

def test_missing_auth_headers(client):
    rv = client.get('/api/auth/me')
    assert rv.status_code == 401
    
def test_campus_endpoints(client):
    # Campus data is only available to signed-in users
    rv = client.get('/api/buildings')
    assert rv.status_code == 401
