export class RandomizerHistory {
  private readonly histories = new Map<string, string[]>();

  select<T extends { id: string }>(
    randomizerId: string,
    sounds: readonly T[],
    random: () => number = Math.random,
  ): T | null {
    const uniqueSounds = [
      ...new Map(sounds.map((sound) => [sound.id, sound])).values(),
    ];
    if (uniqueSounds.length === 0) {
      return null;
    }

    const exclusionCount = Math.min(3, uniqueSounds.length - 1);
    const previous = this.histories.get(randomizerId) ?? [];
    const excludedIds = new Set(previous.slice(-exclusionCount));
    const eligible = uniqueSounds.filter((sound) => !excludedIds.has(sound.id));
    const index = Math.min(
      eligible.length - 1,
      Math.floor(random() * eligible.length),
    );
    const selected = eligible[index];
    const nextHistory = [
      ...previous.filter((id) => id !== selected.id),
      selected.id,
    ];
    this.histories.set(randomizerId, nextHistory.slice(-3));
    return selected;
  }
}
