from __future__ import annotations

import cv2
import numpy as np
import pytest

from first_step_non_vibe import DetectionConfig, detect_vertical_accents


def make_card_with_bar(color: tuple[int, int, int]) -> np.ndarray:
    image = np.full((180, 320, 3), 242, dtype=np.uint8)
    cv2.rectangle(image, (30, 25), (290, 155), (250, 250, 250), -1)
    cv2.rectangle(image, (57, 58), (270, 132), (238, 242, 246), -1)
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


def test_detects_rounded_edge_accent_with_sparse_bounding_box() -> None:
    image = np.full((200, 340, 3), 242, dtype=np.uint8)
    cv2.rectangle(image, (35, 25), (305, 175), (250, 250, 250), -1)
    cv2.rectangle(image, (57, 52), (285, 148), (238, 242, 246), -1)
    points = np.array(
        [[68, 52], [60, 52], [53, 59], [53, 141], [60, 148], [68, 148]],
        dtype=np.int32,
    )
    cv2.polylines(image, [points], False, (43, 108, 236), 5, cv2.LINE_8)

    mask = detect_vertical_accents(
        image,
        DetectionConfig(min_height=60, max_width=24, sensitivity=20),
    )

    assert np.count_nonzero(mask[55:145, 50:72]) > 350


def test_ignores_tall_typographic_stems() -> None:
    image = np.full((220, 620, 3), 246, dtype=np.uint8)
    cv2.rectangle(image, (30, 45), (35, 135), (30, 30, 30), -1)

    mask = detect_vertical_accents(image)

    assert np.count_nonzero(mask) == 0


def test_ignores_low_contrast_vertical_texture() -> None:
    image = np.full((220, 360, 3), 250, dtype=np.uint8)
    cv2.rectangle(image, (95, 35), (320, 185), (225, 225, 225), -1)
    for index, y in enumerate(range(35, 185, 10)):
        shade = 70 if index % 2 == 0 else 80
        cv2.rectangle(image, (90, y), (94, y + 9), (shade, shade, shade), -1)

    mask = detect_vertical_accents(image)

    assert np.count_nonzero(mask) == 0
