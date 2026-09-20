from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys

import cv2

from test_detection import make_card_with_bar


ROOT = Path(__file__).resolve().parents[1]


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT / "src")
    return subprocess.run(
        [sys.executable, "-m", "first_step_non_vibe.cli", *args],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_cli_writes_cleaned_image_and_mask(tmp_path: Path) -> None:
    source = tmp_path / "input.png"
    output = tmp_path / "cleaned.png"
    mask = tmp_path / "mask.png"
    cv2.imwrite(str(source), make_card_with_bar((43, 108, 236)))

    result = run_cli(
        str(source),
        "--output",
        str(output),
        "--mask",
        str(mask),
        "--min-height",
        "50",
        "--max-width",
        "10",
        "--sensitivity",
        "20",
    )

    assert result.returncode == 0, result.stderr
    assert output.exists()
    assert mask.exists()
    assert "Detected and removed" in result.stdout


def test_cli_rejects_unreadable_input(tmp_path: Path) -> None:
    result = run_cli(
        str(tmp_path / "missing.png"),
        "--output",
        str(tmp_path / "cleaned.png"),
    )

    assert result.returncode == 2
    assert "Could not read input image" in result.stderr


def test_cli_rejects_non_positive_threshold(tmp_path: Path) -> None:
    source = tmp_path / "input.png"
    cv2.imwrite(str(source), make_card_with_bar((43, 108, 236)))

    result = run_cli(
        str(source),
        "--output",
        str(tmp_path / "cleaned.png"),
        "--max-width",
        "0",
    )

    assert result.returncode == 2
    assert "positive integer" in result.stderr
