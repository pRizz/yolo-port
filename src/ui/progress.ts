export function renderSectionBanner(title: string): string {
  const divider = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  return `${divider}\n ${title}\n${divider}`;
}

export function writeSectionBanner(
  output: NodeJS.WriteStream,
  title: string
): void {
  output.write(`${renderSectionBanner(title)}\n`);
}
