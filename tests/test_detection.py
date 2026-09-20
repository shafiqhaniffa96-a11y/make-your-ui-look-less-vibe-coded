from __future__ import annotations

import cv2
import numpy as np
import pytest

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


@pytest.mark.parametrize(
    "color",
    [
        (220, 210, 20),  # cyan in BGR
        (180, 30, 210),  # magenta in BGR
        (55, 55, 55),
    ],
)
def test_detection_is_independent_of_accent_color(
    color: tuple[int, int, int],
) -> None:
    mask = detect_vertical_accents(
        make_card_with_bar(color),
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    assert np.count_nonzero(mask[60:130, 52:57]) >= 300


def test_ignores_horizontal_wide_and_short_shapes() -> None:
    image = np.full((180, 320, 3), 242, dtype=np.uint8)
    cv2.rectangle(image, (30, 40), (270, 44), (43, 108, 236), -1)
    cv2.rectangle(image, (70, 60), (105, 145), (43, 108, 236), -1)
    cv2.rectangle(image, (150, 70), (154, 91), (43, 108, 236), -1)

    mask = detect_vertical_accents(
        image,
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    assert np.count_nonzero(mask) == 0


def test_ignores_textured_vertical_region() -> None:
    image = np.full((180, 320, 3), 242, dtype=np.uint8)
    colors = [(20, 60, 220), (220, 70, 20), (60, 200, 80)]
    for index, y in enumerate(range(50, 140, 10)):
        cv2.rectangle(image, (52, y), (56, y + 9), colors[index % 3], -1)

    mask = detect_vertical_accents(
        image,
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    assert np.count_nonzero(mask) == 0


def test_ignores_thin_card_frame() -> None:
    image = np.full((180, 320, 3), 242, dtype=np.uint8)
    cv2.rectangle(image, (30, 25), (290, 155), (210, 210, 210), 2)

    mask = detect_vertical_accents(
        image,
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    assert np.count_nonzero(mask) == 0
