from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, Dict, Any
from datetime import datetime

class EventsQueryParams(BaseModel):
    """
    Pydantic model for validating query parameters for the /events endpoint.

    Validates:
    - start: Optional ISO8601 datetime string
    - end: Optional ISO8601 datetime string
    - cats: Optional comma-separated category list as string

    Custom validation ensures:
    1. Both start and end are provided together if either is present
    2. At least one filter (time range or categories) is provided
    3. Datetime strings are in valid ISO8601 format
    """
    start: Optional[str] = None
    end: Optional[str] = None
    cats: Optional[str] = None

    @field_validator('start', 'end')
    @classmethod
    def validate_datetime_format(cls, v):
        """Validate that datetime strings are in ISO8601 format."""
        if v is not None:
            try:
                # Handle Z suffix for UTC
                v = v.replace('Z', '+00:00')
                datetime.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid datetime format. Must be ISO8601 (e.g., 2025-08-01T00:00:00Z).')
        return v

    @model_validator(mode='after')
    def validate_time_filters(self):
        """Ensure both start and end are provided together for time range filtering."""
        if (self.start is None) != (self.end is None):
            raise ValueError('Both start and end parameters must be provided together.')
        return self

    @model_validator(mode='after')
    def validate_at_least_one_filter(self):
        """Ensure at least one filter (time range or categories) is provided."""
        if not self.start and not self.end and not self.cats:
            raise ValueError('At least one filter (time range or categories) must be provided.')
        return self

class EventModel(BaseModel):
    """
    Pydantic model for validating event data.

    Mirrors the Zod schema in validation.ts with fields:
    - id: string
    - type: string
    - timestamp: ISO8601 datetime string
    - data: dictionary with string keys and any values
    """
    id: str
    type: str
    timestamp: str
    data: Dict[str, Any]

    @field_validator('timestamp')
    @classmethod
    def validate_timestamp_format(cls, v):
        """Validate that timestamp is in ISO8601 format."""
        try:
            # Handle Z suffix for UTC
            v = v.replace('Z', '+00:00')
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError('Invalid datetime format. Must be ISO8601 (e.g., 2025-08-01T00:00:00Z).')
        return v
