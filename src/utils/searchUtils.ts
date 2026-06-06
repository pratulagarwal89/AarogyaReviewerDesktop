import type { IFuseOptions } from "fuse.js";
import type { ProfileListItem } from "../app/types";

export const profileFuseOptions: IFuseOptions<ProfileListItem> = {
  includeMatches: true,
  threshold: 0.3,
  keys: ["name", "id", "dob"],
};

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, waitMs);
  };
}
