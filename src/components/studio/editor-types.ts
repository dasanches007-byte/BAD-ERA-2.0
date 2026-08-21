/**
 * Shared constants for the Site Editor UI.
 *
 * `MEDIA_PICKER_NONE` is a sentinel for the select element, which cannot carry
 * a null value. It is never persisted — the inspector converts it back to null
 * before the payload is saved.
 */
export const MEDIA_PICKER_NONE = "__none__";

export type SaveState = "idle" | "saving" | "saved" | "error";
