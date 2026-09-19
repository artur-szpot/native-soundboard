import {
    createProgressSectorPath,
    remainingPlaybackMilliseconds,
} from "../src/components/PlaybackProgressOverlay";

describe("remainingPlaybackMilliseconds", () => {
  it("uses the actual remaining portion of the sound", () => {
    expect(remainingPlaybackMilliseconds(0, 8)).toBe(8000);
    expect(remainingPlaybackMilliseconds(0.25, 8)).toBe(6000);
    expect(remainingPlaybackMilliseconds(1, 8)).toBe(0);
  });

  it("handles unavailable duration and clamps progress", () => {
    expect(remainingPlaybackMilliseconds(0.5, 0)).toBe(0);
    expect(remainingPlaybackMilliseconds(0.5, Number.NaN)).toBe(0);
    expect(remainingPlaybackMilliseconds(-1, 8)).toBe(8000);
    expect(remainingPlaybackMilliseconds(2, 8)).toBe(0);
  });
});

describe("createProgressSectorPath", () => {
  it("has no revealed sector at the start", () => {
    expect(createProgressSectorPath(0, 100)).toBeNull();
    expect(createProgressSectorPath(-1, 100)).toBeNull();
  });

  it("starts at 12 o'clock and sweeps clockwise", () => {
    expect(createProgressSectorPath(0.25, 100)).toContain(
      "M 50 50 L 50 -20.710678118654755 A 70.71067811865476 70.71067811865476 0 0 1 120.71067811865476 50",
    );
    expect(createProgressSectorPath(0.5, 100)).toContain(" 0 0 1 ");
    expect(createProgressSectorPath(0.75, 100)).toContain(" 0 1 1 ");
  });

  it("uses a complete sector at the end and clamps overflow", () => {
    expect(createProgressSectorPath(1, 100)).toBe(
      createProgressSectorPath(2, 100),
    );
    expect(createProgressSectorPath(1, 100)).toContain(" 0 1 1 ");
  });
});
