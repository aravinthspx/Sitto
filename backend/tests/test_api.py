import pytest
from unittest.mock import patch, MagicMock
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_missing_auth_headers(client):
    rv = client.get('/api/auth/me')
    assert rv.status_code == 401

@patch('app.middleware.auth.jwt.decode')
@patch('app.middleware.auth.supabase')
def test_valid_auth(mock_supabase, mock_decode, client):
    # Mocking JWT
    mock_decode.return_value = {"sub": "user_123"}
    # Mocking Supabase profile response
    mock_res = MagicMock()
    mock_res.data = [{"role": "student", "name": "Test Student"}]
    mock_supabase.table().select().eq().execute.return_value = mock_res
    
    # We must patch get_unverified_header and _jwk_client for ES256
    with patch('app.middleware.auth.jwt.get_unverified_header') as mock_header, \
         patch('app.middleware.auth._jwk_client') as mock_jwk:
        mock_header.return_value = {"alg": "ES256"}
        mock_jwk.get_signing_key_from_jwt.return_value = MagicMock(key="mock_key")
        rv = client.get('/api/auth/me', headers={"Authorization": "Bearer test_token"})
        assert rv.status_code == 200
        assert b"Test Student" in rv.data

@patch('app.routes.campus.supabase')
def test_get_buildings(mock_supabase, client):
    mock_res = MagicMock()
    mock_res.data = [{"id": "BLD01", "name": "CSE Block"}]
    mock_supabase.table().select().execute.return_value = mock_res
    
    rv = client.get('/api/buildings?include_all=1')
    assert rv.status_code == 200
    assert b"CSE Block" in rv.data

@patch('app.routes.campus.supabase')
def test_get_seats(mock_supabase, client):
    # Mock spaces query
    mock_space_res = MagicMock()
    mock_space_res.data = [{"id": "LAB001", "name": "Lab 1", "floor_id": "FL02", "capacity": 30, "type": "Lab"}]
    
    # Mock seats query
    mock_seats_res = MagicMock()
    mock_seats_res.data = [{"id": "uuid-1", "label": "S01"}, {"id": "uuid-2", "label": "S02"}]
    
    # Mock active reservations query (no overlaps)
    mock_res_query = MagicMock()
    mock_res_query.data = []
    
    # The first call is spaces, second is seats, third is reservations
    mock_supabase.table().select().eq().execute.side_effect = [
        mock_space_res, mock_seats_res
    ]
    
    # The reservations query has chained calls (.eq().in_().lt().gt().execute())
    chain_mock = MagicMock()
    chain_mock.execute.return_value = MagicMock(data=[])
    mock_supabase.table().select().eq().in_().lt().gt.return_value = chain_mock
    
    rv = client.get('/api/seats?space_id=LAB001&start=2024-01-01T10:00:00Z&end=2024-01-01T11:00:00Z')
    assert rv.status_code == 200
    assert b"S01" in rv.data

@patch('app.routes.reservations.supabase')
@patch('app.middleware.auth.jwt.decode')
@patch('app.middleware.auth.supabase')
def test_checkout_invalid_state(mock_auth_supabase, mock_decode, mock_route_supabase, client):
    # Auth mock with admin role (checkout requires admin)
    mock_decode.return_value = {"sub": "user_123"}
    mock_res = MagicMock()
    mock_res.data = [{"role": "admin", "name": "Test Admin"}]
    mock_auth_supabase.table().select().eq().execute.return_value = mock_res
    
    # We must patch get_unverified_header and _jwk_client for ES256
    with patch('app.middleware.auth.jwt.get_unverified_header') as mock_header, \
         patch('app.middleware.auth._jwk_client') as mock_jwk:
        mock_header.return_value = {"alg": "ES256"}
        mock_jwk.get_signing_key_from_jwt.return_value = MagicMock(key="mock_key")
        
        # Mock reservation (status is RESERVED, not CHECKED_IN)
        mock_reservation = MagicMock()
        mock_reservation.data = [{"id": "RES1", "user_id": "user_123", "status": "RESERVED"}]
        mock_route_supabase.table().select().eq().execute.return_value = mock_reservation
        
        rv = client.post('/api/reservations/RES1/checkout', headers={"Authorization": "Bearer test_token"})
        assert rv.status_code == 400
        assert b"Cannot checkout from status: RESERVED" in rv.data
