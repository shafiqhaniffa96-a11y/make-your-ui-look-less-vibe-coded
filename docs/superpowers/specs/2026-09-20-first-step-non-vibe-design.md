# First Step to Look Non-Vibe-Coded: Design

## Goal

Create a small open-source command-line tool that removes narrow, solid vertical accent lines from screenshots. Detection must depend on geometry and local contrast rather than a hard-coded colour, so the orange accent in the reference screenshot and equivalent accents in other colours are handled by the same algorithm.

## Repository

- GitHub repository name: `first-step-to-look-non-vibe-coded`
- Visibility: public
- License: MIT
- Copyright: `Copyright (c) 2026 Ahnaf Thaqeef`
- Primary runtime: Python 3.10+

## User Interface

The first release exposes one CLI:

```text
first-step-non-vibe input.png --output cleaned.png --mask detected-mask.png
```

Supported inputs are PNG, JPEG, and WebP images readable by OpenCV. The cleaned image is required. The optional mask shows exactly which pixels were changed, making false detections reviewable.

Useful controls remain deliberately small:

- `--min-height`: minimum vertical run length.
- `--max-width`: maximum stripe width.
- `--sensitivity`: local-contrast threshold.
- `--mask`: optional diagnostic-mask path.

Invalid paths, unreadable formats, and impossible thresholds produce a concise error and a non-zero exit code. If no candidate is found, the tool writes an unchanged output and reports that no line was detected.

## Detection and Removal

The pipeline has four independent stages:

1. Build a colour-distance map by comparing each pixel with a horizontally blurred local background. This makes detection colour-independent.
2. Apply vertical morphology to connect anti-aliased sections of the same accent line.
3. Filter connected components by narrow width, minimum height, strong vertical aspect ratio, fill density, and relative colour consistency. Horizontal rules and ordinary text must not qualify.
4. Expand the accepted mask slightly to include anti-aliased edges, then reconstruct the marked pixels using OpenCV inpainting.

Detection and removal are separate public functions. Callers can inspect the mask without altering the source image, and a future GUI can reuse the engine without invoking the CLI.

## Files

- `src/first_step_non_vibe/detection.py`: mask generation and candidate filtering.
- `src/first_step_non_vibe/removal.py`: mask expansion and inpainting.
- `src/first_step_non_vibe/cli.py`: argument parsing, validation, and file I/O.
- `tests/`: generated synthetic fixtures and behavioural tests.
- `examples/`: synthetic before, mask, and after images safe to publish publicly.
- `README.md`: installation, usage, limitations, and visual example.
- `LICENSE`: standard MIT license text.

A private screenshot may be used only for local validation. It must not be committed to the public repository.

## Testing

Implementation follows test-driven development. Each behaviour is first represented by a failing test:

- remove a narrow orange vertical accent from a pale card;
- remove the same geometry in a different colour;
- preserve a long horizontal rule;
- preserve ordinary text-like components and broad panels;
- save an exact diagnostic mask;
- return a clear error for unreadable input;
- complete a real CLI round trip.

The final verification runs the complete test suite, exercises the CLI on synthetic examples, checks package installation in a clean virtual environment, and locally evaluates the supplied screenshot. Public documentation uses only generated synthetic images.

## Scope Boundaries

Version 1 processes raster screenshots only. It does not edit HTML or CSS, use OCR, remove arbitrary watermarks, or promise perfect reconstruction behind complex textured lines. Those behaviours require separate designs because they carry different false-positive and content-recovery risks.

## Release Result

The completed local repository will be committed on `main`, pushed to the user's GitHub as a public repository, and returned with its GitHub URL plus the exact verification results.
