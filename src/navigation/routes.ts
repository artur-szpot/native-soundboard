import type { Href } from "expo-router";

export function collectionHref(collectionId: string): Href {
  return collectionId === "main"
    ? "/"
    : { pathname: "/collections/[collectionId]", params: { collectionId } };
}

export function parseIds(
  value: string | string[] | undefined,
): readonly string[] {
  const encoded = Array.isArray(value) ? value[0] : value;
  if (!encoded) return [];
  return encoded
    .split(",")
    .map((id) => id.trim())
    .filter((id, index, ids) => id.length > 0 && ids.indexOf(id) === index);
}
