export type Grammar = Record<string, string[]>;
export type FlatGrammar = { symbol: string; prod: string }[];

export const GRAMMAR = {
  A: ["I=E"],
  E: ["T", "E+T", "E-T"],
  T: ["F", "T*F", "T/F"],
  F: ["N", "(E)"],
  I: ["L", "LI"],
  N: ["D", "DN"],
  L: ["id", "a", "r"],
  D: new Array(10).fill(null).map((_, idx) => idx.toString()),
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
