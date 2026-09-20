# First Step to Look Non-Vibe-Coded Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a colour-independent Python CLI that detects and removes narrow solid vertical accent bars from raster screenshots.

**Architecture:** A detection module creates a reviewable binary mask from local horizontal colour contrast, connected-component geometry, and colour consistency. A separate removal module expands the mask and uses OpenCV inpainting; the CLI owns validation and image I/O.

**Tech Stack:** Python 3.10+, NumPy, OpenCV headless, pytest, Hatchling, Git, GitHub

---

## File map

- `pyproject.toml`: package metadata, dependencies, CLI entry point, and pytest settings.
- `src/first_step_non_vibe/detection.py`: public detection configuration and mask generation.
- `src/first_step_non_vibe/removal.py`: inpainting from an accepted mask.
- `src/first_step_non_vibe/cli.py`: CLI parsing, validation, reporting, and file I/O.
- `src/first_step_non_vibe/__init__.py`: stable public Python API.
- `tests/test_detection.py`: colour-independent geometry and false-positive tests.
- `tests/test_removal.py`: pixel reconstruction tests.
- `tests/test_cli.py`: command-line round-trip and errors.
- `scripts/generate_examples.py`: deterministic public synthetic example generation.
- `examples/`: generated before, mask, and after PNGs.
- `README.md`: user documentation and example images.
- `LICENSE`: standard MIT license.
- `.gitignore`: Python and local validation outputs.

### Task 1: Package skeleton and detection contract

**Files:**
- Create: `pyproject.toml`
- Create: `src/first_step_non_vibe/__init__.py`
- Create: `tests/test_detection.py`

- [ ] Write a failing test that creates a pale card with a 5-pixel orange bar and calls `detect_vertical_accents(image, DetectionConfig(...))`; assert the returned `uint8` mask covers the bar.
- [ ] Run `python -m pytest tests/test_detection.py -v` and verify import failure because the package does not exist.
- [ ] Add package metadata and the minimum `DetectionConfig` plus `detect_vertical_accents` implementation needed for the orange fixture.
- [ ] Re-run the focused test and verify it passes.
- [ ] Commit with `git commit -m "feat: detect vertical accent bars"`.

### Task 2: Colour independence and false-positive filtering

**Files:**
- Modify: `tests/test_detection.py`
- Modify: `src/first_step_non_vibe/detection.py`

- [ ] Add failing parameterized tests for cyan, magenta, and dark grey bars with identical geometry.
- [ ] Add failing tests proving a horizontal rule, wide panel, and short text-like rectangle do not enter the mask.
- [ ] Run the focused tests and verify the colour/false-positive cases fail for the intended assertions.
- [ ] Implement local horizontal blur comparison, vertical morphology, connected-component filtering, and interior colour-consistency checks.
- [ ] Run `python -m pytest tests/test_detection.py -v` and verify all detection tests pass.
- [ ] Commit with `git commit -m "feat: make accent detection colour independent"`.

### Task 3: Removal engine and CLI

**Files:**
- Create: `src/first_step_non_vibe/removal.py`
- Create: `src/first_step_non_vibe/cli.py`
- Modify: `src/first_step_non_vibe/__init__.py`
- Create: `tests/test_removal.py`
- Create: `tests/test_cli.py`

- [ ] Write a failing removal test asserting `remove_vertical_accents` replaces the synthetic orange bar with pixels close to the card background while preserving remote pixels.
- [ ] Write failing CLI tests for successful `input.png --output cleaned.png --mask mask.png`, unreadable input, and invalid thresholds.
- [ ] Run both test files and verify failures occur because removal and CLI functions are absent.
- [ ] Implement mask dilation, OpenCV Telea inpainting, argument validation, image writes, and concise detected/no-detection reporting.
- [ ] Run `python -m pytest tests/test_removal.py tests/test_cli.py -v` and verify all pass.
- [ ] Commit with `git commit -m "feat: add image cleanup CLI"`.

### Task 4: Open-source documentation and assets

**Files:**
- Create: `scripts/generate_examples.py`
- Create: `examples/before.png`
- Create: `examples/mask.png`
- Create: `examples/after.png`
- Create: `README.md`
- Create: `LICENSE`
- Create: `.gitignore`

- [ ] Add a failing test in `tests/test_cli.py` that runs the example generator and checks all three deterministic PNG outputs exist with matching dimensions.
- [ ] Run the focused test and verify failure because the generator is absent.
- [ ] Implement the generator using a synthetic unbranded card, then run it to create the example assets.
- [ ] Add installation, CLI, Python API, tuning, limitations, and contribution instructions to the README, embedding the before/mask/after files.
- [ ] Add the exact MIT license text with `Copyright (c) 2026 Ahnaf Thaqeef` and Python/local-output ignore rules.
- [ ] Re-run the focused test and commit with `git commit -m "docs: add MIT release documentation"`.

### Task 5: End-to-end verification and GitHub release

**Files:**
- Create locally and ignore: `validation/reference-mask.png`
- Create locally and ignore: `validation/reference-cleaned.png`

- [ ] Create a clean virtual environment and install the project with test dependencies using `python -m pip install -e ".[test]"`.
- [ ] Run `python -m pytest -v` and require zero failures.
- [ ] Run the installed CLI against `examples/before.png`; verify output and mask dimensions, non-empty mask, and removal of the synthetic stripe.
- [ ] Run the CLI against a private local validation screenshot and visually inspect the mask plus cleaned result without committing either file.
- [ ] Run `python -m build` and inspect the wheel and source archive contents for README, license, and package modules.
- [ ] Check `git status`, ensure no supplied screenshot or validation output is tracked, and commit any final verified changes.
- [ ] Create `ahnafthaqeef/first-step-to-look-non-vibe-coded` as a public GitHub repository, add the remote, push `main`, and verify the public URL and default branch.
