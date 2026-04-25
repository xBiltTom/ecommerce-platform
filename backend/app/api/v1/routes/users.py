from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import Usuario
from app.schemas.user import UserMeResponse


router = APIRouter()


@router.get("/profile", response_model=UserMeResponse)
async def get_my_profile(
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> UserMeResponse:
    return UserMeResponse.model_validate(current_user)
