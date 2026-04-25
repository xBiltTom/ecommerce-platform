"""
Script de seed para crear el usuario administrador inicial.
Ejecutar con: python -m app.seed
"""

import asyncio
import sys

from app.database import async_session_factory
from app.models.usuario import Usuario
from app.utils.security import hash_password

from sqlalchemy import select


ADMIN_EMAIL = "admin@ecommerce.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_NOMBRE = "Admin"
ADMIN_APELLIDO = "Sistema"


async def create_admin():
    async with async_session_factory() as session:
        # Verificar si ya existe
        result = await session.execute(select(Usuario).where(Usuario.email == ADMIN_EMAIL))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"[OK] El admin '{ADMIN_EMAIL}' ya existe.")
            return

        admin = Usuario(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            nombre=ADMIN_NOMBRE,
            apellido=ADMIN_APELLIDO,
            rol="admin",
            activo=True,
        )
        session.add(admin)
        await session.commit()

        print(f"[OK] Admin creado exitosamente:")
        print(f"  Email: {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print(f"  [!] Cambia la contrasena despues del primer login.")


if __name__ == "__main__":
    asyncio.run(create_admin())
