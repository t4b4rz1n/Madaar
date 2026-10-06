/**
 * Utility functions for avatar generation
 */

/**
 * Generate a deterministic Heledone avatar path based on ID and name
 */
export const getHeledoneAvatar = (id?: string | number, name?: string): string => {
  const seed = (String(id || "") + String(name || ""))
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const index = (seed % 10) + 1;
  return `/images/heledone-assets/avatar-${String(index).padStart(2, "0")}.png`;
};
