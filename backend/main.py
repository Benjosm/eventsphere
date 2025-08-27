from fastapi import FastAPI, Response, HTTPException, Depends, Request
from datetime import datetime, timedelta
import os
import json
from typing import Optional

# Import jose for JWT
from jose import jwt
from jose.exceptions import JWTError

# Create FastAPI app
app = FastAPI(title="EventSphere API")

# Get secret key from environment variable
APP_SECRET = os.getenv("APP_SECRET", "your-secret-key-change-in-production")

# Dependency to get current user from JWT token
def get_current_user(request: Request):
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Extract token after "Bearer "
    else:
        # Extract token from auth_token cookie
        token = request.cookies.get("auth_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # Decode and verify JWT
        payload = jwt.decode(token, APP_SECRET, algorithms=["HS256"])
        # Ensure token is not expired
        if datetime.utcnow().timestamp() > payload["exp"]:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Not authenticated")

# Protected endpoint for testing authentication
@app.get("/protected")
def protected_route(current_user: dict = Depends(get_current_user)):
    return {"message": "Authenticated successfully", "user": current_user}

@app.post("/login")
async def login(response: Response):
    """
    Generate a time-limited JWT token and set it in an HttpOnly cookie.
    The token is valid for 15 minutes.
    """
    # Set token expiration to 15 minutes from now
    expire = datetime.utcnow() + timedelta(minutes=15)
    
    # Create the token payload
    token_data = {
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": "authentication"
    }
    
    # Generate the JWT token
    token = jwt.encode(token_data, APP_SECRET, algorithm="HS256")
    
    # Set the HttpOnly cookie with the token
    response.set_cookie(
        key="auth_token",
        value=token,
        path="/",
        httponly=True,
        samesite="strict",
        secure=False  # Set to True in production with HTTPS
    )
    
    # Return 200 with no response body
    return

# Import the EventsQueryParams model
from schemas import EventsQueryParams

# Mock repository functions (to be replaced with actual DB implementation)
async def get_events_by_time_range(start: datetime, end: datetime):
    # Placeholder for actual database query
    return []

async def get_events_by_category(categories: list):
    # Placeholder for actual database query  
    return []

async def get_events_by_time_and_category(start: datetime, end: datetime, categories: list):
    # Placeholder for actual database query
    return []

@app.get("/events")
async def get_events(
    response: Response,
    query_params: EventsQueryParams = Depends(),
    current_user: dict = Depends(get_current_user)
):
    """
    GET endpoint for /events with time range and category filtering.
    
    Validates query parameters through Pydantic model and calls appropriate repository method based on filters.
    Returns 200 with events list on success, appropriate error codes otherwise.
    """
    # Parse categories if provided
    categories = None
    if query_params.cats:
        categories = [cat.strip() for cat in query_params.cats.split(",") if cat.strip()]
        if not categories:
            raise HTTPException(
                status_code=422,
                detail="Invalid categories parameter: must contain at least one non-empty category"
            )
    
    # Parse datetime strings if provided
    start_dt = None
    end_dt = None
    if query_params.start and query_params.end:
        # Handle Z suffix for UTC
        start_str = query_params.start.replace('Z', '+00:00')
        end_str = query_params.end.replace('Z', '+00:00')
        start_dt = datetime.fromisoformat(start_str)
        end_dt = datetime.fromisoformat(end_str)
    
    # Determine which filters are present
    has_time_filter = start_dt is not None and end_dt is not None
    has_category_filter = categories is not None
    
    # Call appropriate repository method based on filters
    if has_time_filter and has_category_filter:
        events = await get_events_by_time_and_category(start_dt, end_dt, categories)
    elif has_time_filter:
        events = await get_events_by_time_range(start_dt, end_dt)
    elif has_category_filter:
        events = await get_events_by_category(categories)
    else:
        # This should not happen due to Pydantic validation, but handle defensively
        raise HTTPException(status_code=422, detail="At least one filter must be provided")
    
    # Return events as JSON response
    return events

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
