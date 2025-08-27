from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import pytest
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Import the app and required modules
from main import app
import os
from jose import jwt

# Create test client with proper configuration to not raise server exceptions
client = TestClient(app, raise_server_exceptions=False)

# Configure to use only asyncio for async tests
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

def create_auth_headers():
    """Helper function to create authentication headers with proper JWT token and cookie"""
    # Create a valid JWT token like the app does
    APP_SECRET = os.getenv("APP_SECRET", "your-secret-key-change-in-production")
    expire = datetime.utcnow() + timedelta(minutes=15)
    token_data = {
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": "authentication"
    }
    token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    return {"Cookie": f"auth_token={token}"}

@pytest.mark.anyio
async def test_valid_parameters():
    """Test GET /events with valid parameters returns 200 OK with filtered events"""
    # Create headers with valid auth
    headers = create_auth_headers()
    
    # Valid ISO8601 timestamps and categories
    start_time = "2025-08-01T00:00:00Z"
    end_time = "2025-08-31T23:59:59Z"
    categories = "concert,conference"
    
    # Mock the appropriate database function
    with patch('main.get_events_by_time_and_category') as mock_get_events:
        # Mock events data
        mock_events = [
            {
                "id": 1,
                "name": "Test Event",
                "description": "Test Description",
                "start_time": "2025-08-15T10:00:00Z",
                "end_time": "2025-08-15T18:00:00Z",
                "location": "Test Location",
                "category": "concert",
                "created_by": 1
            }
        ]
        mock_get_events.return_value = mock_events
        
        response = client.get(
            f"/events?start={start_time}&end={end_time}&cats={categories}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]["name"] == "Test Event"

@pytest.mark.anyio
async def test_invalid_parameters():
    """Test GET /events with invalid start time format returns 422"""
    # Create headers with valid auth
    headers = create_auth_headers()
    
    # Invalid start time format
    invalid_start_time = "invalid-date-format"
    end_time = "2025-08-31T23:59:59Z"
    categories = "concert,conference"
    
    response = client.get(
        f"/events?start={invalid_start_time}&end={end_time}&cats={categories}",
        headers=headers
    )
    
    assert response.status_code == 422

@pytest.mark.anyio
async def test_missing_auth():
    """Test GET /events without auth token returns 401"""
    # Valid parameters but no auth
    start_time = "2025-08-01T00:00:00Z"
    end_time = "2025-08-31T23:59:59Z"
    categories = "concert,conference"
    
    response = client.get(
        f"/events?start={start_time}&end={end_time}&cats={categories}"
    )
    
    assert response.status_code == 401

@pytest.mark.anyio
async def test_database_error():
    """Test GET /events when database fails returns 500"""
    # Create headers with valid auth
    headers = create_auth_headers()
    
    start_time = "2025-08-01T00:00:00Z"
    end_time = "2025-08-31T23:59:59Z"
    categories = "concert,conference"
    
    # Mock the appropriate database function to raise an exception
    with patch('main.get_events_by_time_and_category') as mock_get_events:
        mock_get_events.side_effect = Exception("Database connection failed")
        
        response = client.get(
            f"/events?start={start_time}&end={end_time}&cats={categories}",
            headers=headers
        )
        
        assert response.status_code == 500

@pytest.mark.anyio
async def test_incomplete_time_filter():
    """Test GET /events with only start time (no end) returns 422"""
    # Create headers with valid auth
    headers = create_auth_headers()
    
    # Only start time provided
    start_time = "2025-08-01T00:00:00Z"
    categories = "concert,conference"
    
    response = client.get(
        f"/events?start={start_time}&cats={categories}",
        headers=headers
    )
    
    assert response.status_code == 422

@pytest.mark.anyio
async def test_no_filters():
    """Test GET /events with no filters returns 422"""
    # Create headers with valid auth
    headers = create_auth_headers()
    
    # No parameters provided
    response = client.get("/events", headers=headers)
    
    assert response.status_code == 422
