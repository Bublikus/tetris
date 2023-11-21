const SYMBOLS = {
  empty: "\xA0",
  full: "█",
  top: "▀",
  bottom: "▄",
} as const;

export const blockRenderer = <T extends unknown[][]>(matrix: T): string[][] => {
  function getRenderedMatrix(matrix: T): string[][] {
    return matrix.reduce<string[][]>((acc, row, i, arr) => {
      if (i % 2) return acc;
      const mergedRows = getMergedRows(row, arr[i + 1]);
      acc.push(mergedRows);
      return acc;
    }, []);
  }

  function getMergedRows(rowA: unknown[], rowB?: unknown[]): string[] {
    return rowA.map((cell, i) => getMergedSymbol(cell, rowB?.[i]));
  }

  function getMergedSymbol(smblA?: unknown, smblB?: unknown): string {
    const valueToSymbol = {
      [`11`]: SYMBOLS.full,
      [`10`]: SYMBOLS.top,
      [`01`]: SYMBOLS.bottom,
      [`00`]: SYMBOLS.empty,
    };
    // @ts-ignore
    return valueToSymbol[`${+!!smblA}${+!!smblB}`] ?? SYMBOLS.empty;
  }

  return getRenderedMatrix(matrix);
};
