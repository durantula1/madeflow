export type FieldSnapshot = {
  key: string;
  label: string;
  value: unknown;
};

export type VersionDiffItem = {
  key: string;
  label: string;
  type: "added" | "removed" | "changed" | "unchanged";
  previousValue?: unknown;
  currentValue?: unknown;
};

export function diffSpecificationFields(
  previous: FieldSnapshot[],
  current: FieldSnapshot[],
): VersionDiffItem[] {
  const previousByKey = new Map(previous.map((field) => [field.key, field]));
  const currentByKey = new Map(current.map((field) => [field.key, field]));
  const keys = new Set([...previousByKey.keys(), ...currentByKey.keys()]);

  return [...keys]
    .map((key): VersionDiffItem => {
      const before = previousByKey.get(key);
      const after = currentByKey.get(key);

      if (!before && after) {
        return {
          key,
          label: after.label,
          type: "added",
          currentValue: after.value,
        };
      }
      if (before && !after) {
        return {
          key,
          label: before.label,
          type: "removed",
          previousValue: before.value,
        };
      }

      const isEqual =
        JSON.stringify(before?.value) === JSON.stringify(after?.value);
      return {
        key,
        label: after?.label ?? before?.label ?? key,
        type: isEqual ? "unchanged" : "changed",
        previousValue: before?.value,
        currentValue: after?.value,
      };
    })
    .sort((left, right) => {
      const rank = { changed: 0, added: 1, removed: 2, unchanged: 3 };
      return rank[left.type] - rank[right.type] || left.label.localeCompare(right.label);
    });
}

