"""Public API for First Step to Look Non-Vibe-Coded."""

from .detection import DetectionConfig, detect_vertical_accents
from .removal import remove_vertical_accents

__all__ = [
    "DetectionConfig",
    "detect_vertical_accents",
    "remove_vertical_accents",
]

