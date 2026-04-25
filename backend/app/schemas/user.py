from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserMeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: EmailStr
    nombre: str
    apellido: str
    rol: str
    activo: bool
    fecha_creacion: datetime
