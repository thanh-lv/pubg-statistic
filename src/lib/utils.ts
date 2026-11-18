export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function parseNames(input: string) {
  return [
    ...new Set(
      input
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => /^[\w-]{2,32}$/.test(s)),
    ),
  ];
}
