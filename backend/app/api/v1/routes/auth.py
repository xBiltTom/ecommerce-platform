from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import decode_token
from app.schemas.auth import LoginRequest, RefreshTokenRequest, RegisterRequest, TokenResponse
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenResponse:
    return await AuthService(db).register(payload)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TokenResponse:
    return await AuthService(db).login(payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest) -> TokenResponse:
    try:
        token_payload = decode_token(payload.refresh_token)
        if token_payload.get("typ") != "refresh":
            raise ValueError("Token invalido")
        subject = str(token_payload.get("sub"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalido") from exc

    from app.core.security import create_access_token, create_refresh_token

    return TokenResponse(
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )
