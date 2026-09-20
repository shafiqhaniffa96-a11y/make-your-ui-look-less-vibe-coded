"""Detect narrow, solid vertical accent bars in screenshots."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True, slots=True)
class DetectionConfig:
    """Geometry and contrast thresholds for accent detection."""

    min_height: int = 40
    max_width: int = 14
    sensitivity: float = 24.0


def detect_vertical_accents(
    image: np.ndarray,
    config: DetectionConfig | None = None,
) -> np.ndarray:
    """Return a uint8 mask whose white pixels are detected accent bars."""

    cfg = config or DetectionConfig()
    if image.ndim != 3 or image.shape[2] != 3:
        raise ValueError("image must be a BGR array with three channels")

    work = image.astype(np.float32)
    offset = cfg.max_width + 2
    left = np.roll(work, offset, axis=1)
    right = np.roll(work, -offset, axis=1)
    left_distance = np.linalg.norm(work - left, axis=2)
    right_distance = np.linalg.norm(work - right, axis=2)
    distance = np.minimum(left_distance, right_distance)
    distance[:, :offset] = 0
    distance[:, -offset:] = 0
    raw = (distance >= cfg.sensitivity).astype(np.uint8) * 255
    raw = cv2.morphologyEx(
        raw,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 9)),
    )

    result = np.zeros(image.shape[:2], dtype=np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(raw, connectivity=8)
    for label in range(1, count):
        x, y, width, height, area = stats[label]
        if height < cfg.min_height or width > cfg.max_width:
            continue
        if height / max(width, 1) < 4.0:
            continue
        if area / (width * height) < 0.55:
            continue
        result[labels == label] = 255

    return result
