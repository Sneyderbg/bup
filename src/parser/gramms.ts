export type Grammar = Record<string, string[]>;
export type FlatGrammar = { symbol: string; prod: string }[];

export const GRAMMAR = {
  E: ["T", "E+T"],
  T: ["F", "T*F"],
  F: ["I", "N", "(E)"],
  I: ["L", "LI"],
  N: ["D", "DN"],
  L: ["a", "b"],
  D: ["0", "1"],
} satisfies Grammar;

export const G1 = {
  E: ["T", "E+T"],
  T: ["F", "T*F"],
  F: ["i", "(E)"],
} satisfies Grammar;

export const G0 = {
  V: ["aW"],
  W: ["bbW", "c"],
} satisfies Grammar;

export function flat2Gramm(flat: FlatGrammar): Grammar {
  return flat.reduce((g, p) => {
    if (g[p.symbol]) {
      g[p.symbol].push(p.prod);
    } else {
      g[p.symbol] = [p.prod];
    }
    return g;
  }, {} as Grammar);
}

export function gramm2Flat(gramm: Grammar): FlatGrammar {
  return Object.entries(gramm).flatMap(([symbol, prods]) =>
    prods.map((prod) => ({ symbol, prod })),
  );
}
