from fastapi import FastAPI, Response, HTTPException, Depends, Request
from datetime import datetime, timedelta
import os
import json
from typing import Optional
from fastapi.logger import logger

# Create FastAPI app
app = FastAPI(title="EventSphere API")

# Import jose for JWT
from jose import jwt
from jose.exceptions import JWTError

# Add CORS middleware
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Set-Cookie"],
)

# Get secret key from environment variable
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

# Middleware to authenticate JWT from cookie
class JWTMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Only process HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip authentication for /login and health check
        if request.url.path == "/login" or request.url.path == "/health":
            await self.app(scope, receive, send)
            return

        # Extract token from 'token' HttpOnly cookie
        token = request.cookies.get("token")

        if not token:
            logger.warning(f"Authentication failed: no token provided for path {request.url.path}")
            # Send 401 response directly
            response = Response(
                content='{"detail": "Not authenticated"}',
                status_code=401,
                media_type="application/json"
            )
            await response(scope, receive, send)
            return

        try:
            # Decode and verify JWT
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

            # Ensure token is not expired
            if datetime.utcnow().timestamp() > payload["exp"]:
                logger.warning(f"Authentication failed: token expired for path {request.url.path}")
                response = Response(
                    content='{"detail": "Not authenticated"}',
                    status_code=401,
                    media_type="application/json"
                )
                await response(scope, receive, send)
                return

            # Store user in state for downstream handlers (optional)
            request.state.user = payload
            logger.info(f"Successfully authenticated user for path {request.url.path}")

        except JWTError as e:
            logger.warning(f"Authentication failed: JWT error for path {request.url.path}: {str(e)}")
            response = Response(
                content='{"detail": "Not authenticated"}',
                status_code=401,
                media_type="application/json"
            )
            await response(scope, receive, send)
            return

        # Proceed with the request
        await self.app(scope, receive, send)

# Add JWT middleware after CORS
app.add_middleware(JWTMiddleware)

# Exception handler for JWT errors
@app.exception_handler(JWTError)
async def jwt_exception_handler(request: Request, exc: JWTError):
    # Log the error details
    logger.warning(f"JWT validation failed: {str(exc)}")
    return Response(
        content='{"detail": "Unauthorized"}',
        status_code=401,
        media_type="application/json"
    )

# Exception handler for unauthorized access
@app.exception_handler(401)
async def unauthorized_exception_handler(request: Request, exc: HTTPException):
    logger.warning("Unauthorized access attempt")
    return Response(
        content='{"detail": "Unauthorized"}',
        status_code=401,
        media_type="application/json"
    )

# Protected endpoint for testing authentication
@app.get("/protected")
def protected_route(request: Request):
    return {"message": "Authenticated successfully", "user": request.state.user}

# Dependency to get current user
def get_current_user(request: Request):
    if not hasattr(request.state, "user"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return request.state.user

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
    token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
    
    # Set the HttpOnly cookie with the token using correct name
    response.set_cookie(
        key="token",
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

@app.get("/health")
def health_check():
    logger.info("Health check requested")
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event():
    logger.info("Application startup: EventSphere API is starting")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown: EventSphere API is stopping")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
