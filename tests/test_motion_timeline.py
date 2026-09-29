import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "motion"))
import timeline  # noqa: E402


def project(tmp: Path) -> Path:
    cat = tmp / "src" / "catalog"
    cat.mkdir(parents=True)
    (cat / "core.ts").write_text(
        "export const CORE = {\n"
        "  Odometer: { component: Odometer, size: 'chest', shotcraft: [], use: '' },\n"
        "  FunnelIntro: { component: FunnelIntro, size: 'full', shotcraft: [], use: '' },\n"
        "};\n", encoding="utf-8")
    return tmp


def shots(tmp: Path, name: str, items: list) -> Path:
    p = tmp / name
    p.write_text(json.dumps({"shots": items}), encoding="utf-8")
    return p


class TimelineTest(unittest.TestCase):
    def test_collision_clips_earlier_shot_and_counts_overlap_once(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = project(Path(d))
            a = shots(tmp, "a.json", [{"id": "V01", "component": "Odometer", "start": 10, "frames": 150, "props": {}}])
            b = shots(tmp, "b.json", [{"id": "X01", "component": "FunnelIntro", "start": 12, "frames": 90, "props": {}}])
            out = timeline.build(tmp, [a, b], 100)["shots"]
            self.assertEqual([s["id"] for s in out], ["V01", "X01"])
            self.assertAlmostEqual(out[0]["end"], 11.95)
            self.assertAlmostEqual(out[1]["end"], 15.0)

    def test_unknown_component_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = project(Path(d))
            a = shots(tmp, "a.json", [{"id": "V01", "component": "Nope", "start": 1, "frames": 30}])
            with self.assertRaises(SystemExit):
                timeline.build(tmp, [a], None)

    def test_duplicate_ids_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = project(Path(d))
            a = shots(tmp, "a.json", [{"id": "V01", "component": "Odometer", "start": 1, "frames": 30}])
            b = shots(tmp, "b.json", [{"id": "V01", "component": "Odometer", "start": 5, "frames": 30}])
            with self.assertRaises(SystemExit):
                timeline.build(tmp, [a, b], None)

    def test_library_catalog_is_readable(self):
        names = timeline.catalog_names(ROOT / "motion")
        for core in ("Odometer", "MarkerNumber", "BlurRows", "PillChain", "FunnelIntro", "FunnelLight", "DocScroll", "DocStackBrake"):
            self.assertIn(core, names)
        self.assertEqual(names["FunnelIntro"], "full")
        self.assertEqual(names["Odometer"], "chest")


if __name__ == "__main__":
    unittest.main()
