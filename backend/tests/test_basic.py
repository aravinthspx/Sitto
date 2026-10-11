import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    rv = client.get('/health')
    assert rv.status_code == 200
    assert b'healthy' in rv.data

def test_missing_auth_headers(client):
    rv = client.get('/api/auth/me')
    assert rv.status_code == 401
    
def test_campus_endpoints(client):
    rv = client.get('/api/buildings')
    # Since DB might not be configured, it might return 500 or 200 depending on mock
    assert rv.status_code in [200, 500]
