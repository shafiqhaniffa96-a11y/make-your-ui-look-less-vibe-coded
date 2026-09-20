"""Remove detected accent bars while preserving the surrounding screenshot."""

from __future__ import annotations

import cv2
import numpy as np

from .detection import DetectionConfig, detect_vertical_accents


def remove_vertical_accents(
    image: np.ndarray,
    config: DetectionConfig | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Return ``(cleaned_image, detection_mask)`` for a BGR screenshot."""

    mask = detect_vertical_accents(image, config)
    if not np.any(mask):
        return image.copy(), mask

    expanded = cv2.dilate(
        mask,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)),
        iterations=1,
    )
    cleaned = cv2.inpaint(image, expanded, 3, cv2.INPAINT_TELEA)
    return cleaned, expanded
