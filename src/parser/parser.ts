import { Queue } from "queue-typescript";
import { Item } from "./item";
import {
  flat2Gramm,
  gramm2Flat,
  GRAMMAR,
  type FlatGrammar,
  type Grammar,
} from "./gramms";

export type ParsingStep = { stack: string; input: string; action: string };

export class LR0<T extends Grammar> {
  augmentedS: { symbol: string; prod: string };
  grammar: T;
  flatGrammar: FlatGrammar;
  terms: string[]; // terminals, auto infered if not passed
  nonTerms: string[];
  table;

  constructor(grammar: T, terms?: string[]) {
    this.grammar = grammar;
    this.flatGrammar = gramm2Flat(grammar);
    this.terms = terms ?? this.getTerms();
    this.nonTerms = Object.keys(grammar);
    this.augmentedS = this.getAugmentedS();
    this.checkGrammar();

    this.table = this.getTable();
  }

  static fromFlatGrammar<G extends FlatGrammar>(flatGramm: G) {
    const gramm = flat2Gramm(flatGramm);
    return new this(gramm);
  }

  private getAugmentedS() {
    let augmentedSSymbol = "A";
    while (augmentedSSymbol in this.grammar) {
      augmentedSSymbol = String.fromCharCode(
        augmentedSSymbol.charCodeAt(0) + 1,
      );
    }
    return {
      symbol: augmentedSSymbol,
      prod: Object.keys(this.grammar)[0],
    };
  }

  checkGrammar() {
    this.flatGrammar.forEach(({ symbol, prod }, idx) => {
      for (const token of this.splitTokens(prod, false)) {
        if (this.isTerm(token)) {
          if (this.terms.findIndex((t) => t === token) === -1) {
            console.log(
              `${symbol} -> ${prod} : `,
              this.splitTokens(prod, false),
            );
            throw new ValidationError(
              "missingTerm",
              idx,
              token,
              prod.indexOf(token),
            );
          }
        } else {
          if (this.nonTerms.findIndex((nt) => nt === token) === -1) {
            throw new ValidationError(
              "missingNonTerm",
              idx,
              token,
              prod.indexOf(token),
            );
          }
        }
      }
    });
  }

  isTerm(w: string): boolean {
    return !/[A-Z]/.test(w);
  }

  getTerms(): string[] {
    const terms: string[] = [];
    for (const k in this.grammar) {
      for (const prod of this.grammar[k]) {
        let i = 0;
        while (i < prod.length) {
          let termStr = "";
          while (i < prod.length && this.isTerm(prod[i])) {
            termStr += prod[i];
            i++;
          }
          if (termStr.length > 0 && terms.every((t) => termStr !== t)) {
            terms.push(termStr);
          }
          i++;
        }
      }
    }
    return [...terms, "$"];
  }

  getTerm(w: string): string {
    let i = 0;
    while (
      i <= w.length &&
      this.terms.some((t) => t.startsWith(w.slice(0, i)))
    ) {
      i++;
    }
    i--;
    return i > 0 ? w.slice(0, i) : "$";
  }

  splitTokens(w: string, includeLambda: boolean = true): string[] {
    const symbols: string[] = [];
    let i = 0;
    while (i < w.length) {
      if (w[i] === "λ" && !includeLambda) {
        i++;
        continue;
      }
      let termStr: string;
      if (this.terms.some((t) => t[0].includes(w[i]))) {
        termStr = this.getTerm(w.slice(i));
      } else {
        termStr = w[i];
      }
      symbols.push(termStr);
      i += termStr.length;
    }
    return symbols;
  }

  isNullable(w: string): boolean {
    if (this.isTerm(w)) {
      return w === "λ";
    }
    if (w.length === 1) {
      for (const prod of this.grammar[w]) {
        if (prod.indexOf(w) === -1) {
          if (this.isNullable(prod)) return true;
        }
      }
      return false;
    }

    return w.split("").every((c) => this.isNullable(c));
  }

  isInitial(varName: string): boolean {
    return Object.keys(this.grammar).indexOf(varName) === 0;
  }

  firstOf(w: string, parent: string | null = null): string[] {
    if (w.length === 1 && this.isTerm(w)) {
      return [w];
    }

    // get longest token with terms
    let termStr = "";
    let i = 0;
    while (i < w.length && this.isTerm(w[i])) {
      termStr += w[i];
      i++;
    }

    if (termStr.length > 0) {
      return [termStr];
    } // else no terms at begining

    const first: string[] = [];
    const key = w[0];
    for (const prod of this.grammar[key]) {
      first.push(...this.firstOf(prod, key));
      if (this.isNullable(prod) && prod.length > 1 && prod[1] !== w[0]) {
        first.push(...this.firstOf(prod.slice(1)));
      }
    }

    if (
      this.isNullable(w[0]) &&
      w.length > 1 &&
      parent !== null &&
      w.slice(1).indexOf(parent) === -1
    ) {
      first.push(...this.firstOf(w.slice(1), parent));
    }
    return [...new Set(first)];
  }

  nextOf(varName: string): string[] {
    let nextSet: string[] = this.isInitial(varName) ? ["$"] : [];

    for (const k in this.grammar) {
      for (const prod of this.grammar[k]) {
        const idx = prod.indexOf(varName);

        // if varName is last and different from its parent
        if (idx === prod.length - 1) {
          if (k !== varName) {
            nextSet.push(...this.nextOf(k));
          }
        } else if (idx >= 0) {
          nextSet.push(...this.firstOf(prod.slice(idx + 1), k));
          if (this.isNullable(prod.slice(idx + 1))) {
            nextSet.push(...this.nextOf(k));
          }
        }
      }
    }
    nextSet = Array.from(new Set(nextSet));
    nextSet = nextSet.filter((item) => item !== "λ");
    return nextSet;
  }

  getFirsts(): T {
    const firsts = Object.keys(this.grammar).map((k) => [k, this.firstOf(k)]);
    return Object.fromEntries(firsts);
  }

  getNexts(): T {
    const nexts = Object.keys(this.grammar).map((k) => [k, this.nextOf(k)]);
    return Object.fromEntries(nexts);
  }

  getTable() {
    const table: Record<string, string>[] = []; // rows

    const canonicals = this.getCanonical();

    canonicals.map(({ items }) => {
      const row: Record<string, string> = {};

      for (const item of items) {
        if (item.getType() === "reduction") {
          if (this.isInitial(item.r.join(""))) {
            row["$"] = "acc";
          } else {
            for (const term of this.nextOf(item.l)) {
              if (row[term] && row[term].length > 0) {
                // throw new Error(`${term} already assigned`);
              } else {
                row[term] =
                  `R${this.flatGrammar.findIndex((o) => o.symbol === item.l && o.prod === item.r.join(""))}`;
              }
            }
          }
        } else {
          const next = item.nextSymbol();
          if (item.next === undefined) console.error(item);

          if (next) {
            if (this.isTerm(next)) {
              row[next] = `S${item.next}`;
            } else {
              row[next] = `${item.next}`;
            }
          }
        }
      }

      table.push(row);
    });

    return table;
  }

  closure(I: Item[]): Item[] {
    const items: Item[] = I;
    const queue = new Queue<Item>(...I);

    const exists = (items: Item[], item: Item) => {
      return items.some((otherIt) => item.equals(otherIt));
    };

    while (queue.length > 0) {
      const item = queue.dequeue();
      const sym = item.nextSymbol();
      if (sym && !this.isTerm(sym)) {
        for (const prod of this.grammar[sym]) {
          const newItem = new Item(sym, this.splitTokens(prod), 0);

          if (!exists(items, newItem)) {
            items.push(newItem);
            queue.enqueue(newItem);
          }
        }
      }
    }

    return items;
  }

  goto(I: Item[], X: string) {
    const gotoI = I.filter((i) => i.nextSymbol() === X).map((i) =>
      i.moveClosure(),
    );

    return this.closure(gotoI);
  }

  getCanonical() {
    const initialItem = new Item(
      this.augmentedS.symbol,
      [this.augmentedS.prod],
      0,
    );
    const can = [
      {
        read: this.augmentedS.symbol,
        items: this.closure([initialItem]),
      },
    ];
    const itemsAdded = [...can[0].items];

    for (let i = 0; i < can.length; i++) {
      const { items } = can[i];
      for (const sym of [...this.nonTerms, ...this.terms]) {
        const gotoI = this.goto(items, sym);
        if (
          gotoI.length > 0 &&
          !can.some(({ read }) => read === gotoI[0].stringRead())
        ) {
          can.push({
            read: gotoI[0].stringRead(),
            items: gotoI.map((it) => {
              const itAdded = itemsAdded.find((otherI) => otherI.equals(it));
              if (itAdded) {
                if (itAdded.next !== undefined) {
                  return itAdded.copy();
                } else {
                  return itAdded;
                }
              } else {
                itemsAdded.push(it);
                return it;
              }
            }),
          });
          items
            .filter((i) => i.nextSymbol() === sym)
            .forEach((i) => i.withNext(can.length - 1));
        }
      }
    }

    // can.forEach(({ read, items }, idx) => {
    //   console.log(`I${idx}: ${read}`);
    //   items.forEach((i) => {
    //     console.log(`    ${i.toString()}`);
    //   });
    // });

    return can;
  }

  parse(str: string) {
    str += "$";
    const stack = ["$", 0];
    const steps: ParsingStep[] = [];

    let i = 0;
    while (i < str.length && stack.length > 0) {
      const c = this.getTerm(str.slice(i));
      const head = stack[stack.length - 1];
      let step = {
        stack: stack.join(""),
        input: str.slice(i),
        action: "",
      };

      if (typeof head === "number") {
        const action = this.table[head][c];
        if (!action) {
          step.action = "err";
          steps.push(step);
          break;
        }

        step.action = action;

        if (action[0] === "S") {
          stack.push(c, parseInt(action.slice(1)));
          i += c.length;
        } else if (action[0] === "R") {
          const reduction = this.flatGrammar[parseInt(action.slice(1))];
          const toReplace = this.splitTokens(reduction.prod);
          let j = toReplace.pop();
          while (j !== undefined) {
            const h = stack.pop();
            if (typeof h === "number") continue;
            if (h === j) {
              j = toReplace.pop();
              continue;
            }
            step.action = "err";
          }

          const lastState = stack[stack.length - 1];
          if (typeof lastState !== "number") {
            throw Error(`${stack} ${str} -> lastState is not a number`);
          } else {
            const sym = reduction.symbol as string;
            const nextState = this.table[lastState][sym];
            stack.push(sym);
            stack.push(parseInt(nextState));
          }
        } else if (action === "acc") {
          i += c.length;
        }
      }
      steps.push(step);
    }
    return steps;
  }
}

export class ValidationError extends Error {
  cause: { atProdIdx: number; symbol: string; idx: number };
  type: "missingNonTerm" | "missingTerm";

  constructor(
    type: "missingNonTerm" | "missingTerm",
    atProdIdx: number,
    symbol: string,
    idx: number,
  ) {
    super();
    this.type = type;
    this.cause = { atProdIdx, symbol, idx };
    this.message = `${type === "missingNonTerm" ? "Non-Term" : "Term"} '${this.cause.symbol}' not found in grammar definition`;
  }
}

const lr = new LR0(GRAMMAR);

console.log(lr.nextOf("B"));
