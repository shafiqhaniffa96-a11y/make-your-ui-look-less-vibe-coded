"""Generate deterministic, unbranded public example images."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from first_step_non_vibe import DetectionConfig, remove_vertical_accents  # noqa: E402


def make_example() -> np.ndarray:
    image = np.full((420, 720, 3), (244, 246, 248), dtype=np.uint8)
    cv2.rectangle(image, (68, 54), (652, 366), (255, 255, 255), -1)
    cv2.rectangle(image, (68, 54), (652, 366), (224, 228, 232), 2)
    cv2.putText(
        image,
        "Project overview",
        (110, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.85,
        (35, 42, 52),
        2,
        cv2.LINE_AA,
    )
    cv2.rectangle(image, (108, 162), (612, 302), (241, 246, 250), -1)
    cv2.rectangle(image, (108, 162), (114, 302), (38, 112, 238), -1)
    cv2.putText(
        image,
        "Current milestone",
        (142, 215),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.62,
        (65, 75, 86),
        1,
        cv2.LINE_AA,
    )
    cv2.putText(
        image,
        "READY",
        (142, 270),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.05,
        (25, 42, 58),
        2,
        cv2.LINE_AA,
    )
    return image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "examples",
    )
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    before = make_example()
    after, mask = remove_vertical_accents(
        before,
        DetectionConfig(min_height=90, max_width=12, sensitivity=24),
    )
    for name, image in (("before.png", before), ("mask.png", mask), ("after.png", after)):
        if not cv2.imwrite(str(args.output_dir / name), image):
            raise RuntimeError(f"Could not write {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

