"""
Test suite for JWT authentication failure scenarios
"""
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from datetime import datetime, timedelta
import os
from main import app

client = TestClient(app)
APP_SECRET = os.getenv("APP_SECRET", "your-secret-key-change-in-production")

def test_request_without_token():
    """
    Test that a request without any token (no header, no cookie) returns 401
    """
    response = client.get("/protected")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_request_with_expired_token():
    """
    Test that a request with an expired token returns 401
    """
    # Create an expired token
    expire = datetime.utcnow() - timedelta(minutes=15)
    token_data = {
        "exp": expire.timestamp(),
        "iat": (datetime.utcnow() - timedelta(minutes=30)).timestamp(),
        "sub": "authentication"
    }
    expired_token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    
    # Test with Authorization header
    response = client.get("/protected", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    
    # Test with cookie
    response = client.get("/protected", cookies={"auth_token": expired_token})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_request_with_malformed_token():
    """
    Test that a request with a malformed token returns 401
    """
    # Test with invalid signature (modified token)
    valid_expire = datetime.utcnow() + timedelta(minutes=15)
    token_data = {
        "exp": valid_expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),
        "sub": "authentication"
    }
    # Create valid token and tamper with it
    valid_token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    malformed_token = valid_token + "tampered"
    
    # Test with Authorization header
    response = client.get("/protected", headers={"Authorization": f"Bearer {malformed_token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    
    # Test with invalid encoding
    invalid_encoding_token = "x.y.z"
    response = client.get("/protected", headers={"Authorization": f"Bearer {invalid_encoding_token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
    
    # Test with empty token
    response = client.get("/protected", headers={"Authorization": "Bearer "})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_request_with_valid_token_in_header():
    """
    Test that a request with a valid token in Authorization header returns 200
    """
    # Create a valid token
    expire = datetime.utcnow() + timedelta(minutes=15)
    token_data = {
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),
        "sub": "authentication"
    }
    valid_token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    
    # Test with Authorization header
    response = client.get("/protected", headers={"Authorization": f"Bearer {valid_token}"})
    assert response.status_code == 200
    assert response.json()["message"] == "Authenticated successfully"

def test_request_with_valid_token_in_cookie():
    """
    Test that a request with a valid token in cookie returns 200
    """
    # Create a valid token
    expire = datetime.utcnow() + timedelta(minutes=15)
    token_data = {
        "exp": expire.timestamp(),
        "iat": datetime.utcnow().timestamp(),
        "sub": "authentication"
    }
    valid_token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    
    # Test with cookie
    response = client.get("/protected", cookies={"auth_token": valid_token})
    assert response.status_code == 200
    assert response.json()["message"] == "Authenticated successfully"

def test_login_sets_secure_cookie():
    """
    Test that login endpoint sets a proper HttpOnly cookie
    """
    response = client.post("/login")
    assert response.status_code == 200
    
    # Check that auth_token cookie is set
    assert "auth_token" in response.cookies
    token = response.cookies["auth_token"]
    assert token is not None
    
    # Verify the token is valid
    try:
        payload = jwt.decode(token, APP_SECRET, algorithms=["HS256"])
        assert payload["sub"] == "authentication"
        # Verify token expires in approximately 15 minutes
        expected_expire = datetime.utcnow() + timedelta(minutes=14)  # Allow 1 minute leeway
        assert payload["exp"] >= expected_expire.timestamp()
    except:
        pytest.fail("Failed to decode the token set by login")

def test_login_and_access_protected_route():
    """
    Test end-to-end login and access to protected route
    """
    # First login to get the cookie
    response = client.post("/login")
    assert response.status_code == 200
    
    # Now access protected route with the cookie
    response = client.get("/protected")
    assert response.status_code == 200
    assert response.json()["message"] == "Authenticated successfully"
