"""Detect narrow, solid vertical accent bars in screenshots."""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True, slots=True)
class DetectionConfig:
    """Geometry and contrast thresholds for accent detection."""

    min_height: int = 40
    max_width: int = 20
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
    candidates: list[tuple[int, int, int, int, int, np.ndarray]] = []
    for label in range(1, count):
        x, y, width, height, area = stats[label]
        if height < cfg.min_height or width > cfg.max_width:
            continue
        if height / max(width, 1) < 4.0:
            continue
        if area / (width * height) < 0.30:
            continue
        component_pixels = work[labels == label]
        if float(np.mean(np.std(component_pixels, axis=0))) > 28.0:
            continue
        median_color = np.median(component_pixels, axis=0)
        candidates.append((label, x, y, width, height, median_color))

    paired_frames: set[int] = set()
    for index, first in enumerate(candidates):
        for second in candidates[index + 1 :]:
            _, first_x, first_y, first_width, first_height, first_color = first
            _, second_x, second_y, second_width, second_height, second_color = second
            same_span = (
                abs(first_y - second_y) <= 3
                and abs(first_height - second_height) <= 3
            )
            separated = abs(first_x - second_x) > 2 * cfg.max_width
            same_color = float(np.linalg.norm(first_color - second_color)) <= 10.0
            thin_pair = first_width <= 3 and second_width <= 3
            if same_span and separated and same_color and thin_pair:
                paired_frames.update((first[0], second[0]))

    for label, *_ in candidates:
        if label not in paired_frames:
            result[labels == label] = 255

    return result
