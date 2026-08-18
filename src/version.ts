export const PLUGIN_VERSION = "0.1.6";
export const PLUGIN_PACKAGE = "@april-jk/dsh-mobile";
export const PLUGIN_REPOSITORY = "april-jk/dsh-mobile-plugin";

export function compareVersions(left: string, right: string) {
  const parse = (value: string) => value.split(".").map((part) => Number(part));
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
