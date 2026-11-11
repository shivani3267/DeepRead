from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-Internal-Service-Key", auto_error=False)

def verify_internal_key(api_key: str = Security(api_key_header)):
    """
    Validates that incoming requests to internal endpoints contain the pre-shared secret key.
    Blocks any direct untrusted browser calls from bypassing Express authorization.
    """
    if not api_key or api_key != settings.INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing internal service authorization key.",
        )
    return True
