from __future__ import annotations

import numpy as np

from first_step_non_vibe import DetectionConfig, remove_vertical_accents
from test_detection import make_card_with_bar


def test_removal_reconstructs_card_and_preserves_remote_pixels() -> None:
    source = make_card_with_bar((43, 108, 236))
    remote_before = source[30:45, 250:270].copy()

    cleaned, mask = remove_vertical_accents(
        source,
        DetectionConfig(min_height=50, max_width=10, sensitivity=20),
    )

    target = cleaned[70:120, 52:57].astype(np.int16)
    expected = np.full_like(target, 250)
    assert float(np.mean(np.abs(target - expected))) < 12.0
    assert np.array_equal(cleaned[30:45, 250:270], remote_before)
    assert np.count_nonzero(mask) > 0
    changed = np.any(cleaned != source, axis=2)
    assert not np.any(changed & (mask == 0))
