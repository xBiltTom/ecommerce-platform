"""
Servicio de gestión de imágenes locales.
"""

import os
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.exceptions import ValidationException


class ImagenService:

    @staticmethod
    async def upload(file: UploadFile) -> str:
        """Sube una imagen al filesystem local y retorna la ruta relativa."""
        if not file.filename:
            raise ValidationException("El archivo no tiene nombre")

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise ValidationException(
                f"Extensión no permitida. Usar: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
            )

        # Leer contenido y validar tamaño
        content = await file.read()
        if len(content) > settings.max_image_bytes:
            raise ValidationException(
                f"El archivo excede el tamaño máximo de {settings.MAX_IMAGE_SIZE_MB}MB"
            )

        # Crear directorio si no existe
        upload_path = settings.upload_path
        upload_path.mkdir(parents=True, exist_ok=True)

        # Guardar con nombre único
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = upload_path / filename

        with open(filepath, "wb") as f:
            f.write(content)

        # Retornar ruta relativa para guardar en BD
        return f"/static/uploads/productos/{filename}"

    @staticmethod
    def delete(image_path: str) -> None:
        """Elimina una imagen del filesystem local."""
        if not image_path:
            return

        # Construir ruta absoluta desde la relativa
        base = Path(os.path.dirname(os.path.dirname(__file__)))
        full_path = base / image_path.lstrip("/")

        if full_path.exists():
            full_path.unlink()
