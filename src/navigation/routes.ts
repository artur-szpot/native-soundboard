import type { Href } from "expo-router";

export function collectionHref(collectionId: string): Href {
  return collectionId === "main"
    ? "/"
    : { pathname: "/collections/[collectionId]", params: { collectionId } };
}
