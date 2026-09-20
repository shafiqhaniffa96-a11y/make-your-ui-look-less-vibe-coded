from __future__ import annotations

import cv2
import numpy as np

from first_step_non_vibe import DetectionConfig, detect_vertical_accents


def make_card_with_bar(color: tuple[int, int, int]) -> np.ndarray:
    image = np.full((180, 320, 3), 242, dtype=np.uint8)
    cv2.rectangle(image, (30, 25), (290, 155), (250, 250, 250), -1)
    cv2.rectangle(image, (52, 58), (56, 132), color, -1)
    return image


def test_detects_narrow_orange_vertical_accent() -> None:
    image = make_card_with_bar((43, 108, 236))  # BGR orange

    mask = detect_vertical_accents(
        image,
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    assert mask.dtype == np.uint8
    assert mask.shape == image.shape[:2]
    assert np.count_nonzero(mask[60:130, 52:57]) >= 300
    assert np.count_nonzero(mask[:, :30]) == 0
