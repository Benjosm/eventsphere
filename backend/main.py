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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
