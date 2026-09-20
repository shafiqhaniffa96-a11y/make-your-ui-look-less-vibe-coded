"""Command-line interface for screenshot accent removal."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

import cv2
import numpy as np

from .detection import DetectionConfig
from .removal import remove_vertical_accents


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be a positive number")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="first-step-non-vibe",
        description="Remove narrow solid vertical accent bars from screenshots.",
    )
    parser.add_argument("input", type=Path, help="PNG, JPEG, or WebP screenshot")
    parser.add_argument("--output", "-o", required=True, type=Path)
    parser.add_argument("--mask", type=Path, help="Optional diagnostic mask")
    parser.add_argument("--min-height", type=positive_int, default=40)
    parser.add_argument("--max-width", type=positive_int, default=14)
    parser.add_argument("--sensitivity", type=positive_float, default=24.0)
    return parser


def _write_image(path: Path, image: np.ndarray, parser: argparse.ArgumentParser) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(path), image):
        parser.exit(2, f"error: Could not write image: {path}\n")


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    image = cv2.imread(str(args.input), cv2.IMREAD_COLOR)
    if image is None:
        parser.exit(2, f"error: Could not read input image: {args.input}\n")

    config = DetectionConfig(
        min_height=args.min_height,
        max_width=args.max_width,
        sensitivity=args.sensitivity,
    )
    cleaned, mask = remove_vertical_accents(image, config)
    _write_image(args.output, cleaned, parser)
    if args.mask:
        _write_image(args.mask, mask, parser)

    detected_pixels = int(np.count_nonzero(mask))
    if detected_pixels:
        print(f"Detected and removed vertical accents ({detected_pixels} masked pixels).")
    else:
        print("No vertical accent detected; wrote an unchanged copy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
