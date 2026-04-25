"""
Utilidades para generación de slugs URL-friendly.
"""

from slugify import slugify as _slugify


def generate_slug(text: str) -> str:
    """Genera un slug a partir de un texto."""
    return _slugify(text, lowercase=True, max_length=300)
