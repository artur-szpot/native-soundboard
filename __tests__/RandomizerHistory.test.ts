import { RandomizerHistory } from "../src/randomizer/RandomizerHistory";

const sounds = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
  { id: "d" },
  { id: "e" },
];

describe("RandomizerHistory", () => {
  it("deduplicates candidates and handles empty randomizers", () => {
    const history = new RandomizerHistory();

    expect(history.select("empty", [])).toBeNull();
    expect(history.select("one", [sounds[0], sounds[0]], () => 0)).toBe(
      sounds[0],
    );
  });

  it("excludes the last three distinct selections when four or more alternatives exist", () => {
    const history = new RandomizerHistory();
    const selected = [
      history.select("mix", sounds, () => 0),
      history.select("mix", sounds, () => 0),
      history.select("mix", sounds, () => 0),
      history.select("mix", sounds, () => 0),
    ];

    expect(selected.map((sound) => sound?.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps two-sound randomizers playable without immediate repeats", () => {
    const history = new RandomizerHistory();

    expect(history.select("pair", sounds.slice(0, 2), () => 0)?.id).toBe("a");
    expect(history.select("pair", sounds.slice(0, 2), () => 0)?.id).toBe("b");
    expect(history.select("pair", sounds.slice(0, 2), () => 0)?.id).toBe("a");
  });
});
