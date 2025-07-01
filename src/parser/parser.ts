import { Queue } from "queue-typescript";

export type Grammar = Record<string, string[]>;

export const GRAMMAR = {
  E: ["T", "E+T"],
  T: ["F", "T*F"],
  F: ["I", "N", "(E)"],
  I: ["L", "LI"],
  N: ["D", "DN"],
  L: ["a", "b"],
  D: ["0", "1"],
} satisfies Grammar;

const G1 = {
  E: ["T", "E+T"],
  T: ["F", "T*F"],
  F: ["i", "(E)"],
};
// const G0 = {
//   V: ["aW"],
//   W: ["bbW", "c"],
// };

class Item {
  next?: number;
  l: string;
  r: string;
  closurePos: number;

  constructor(l: string, r: string, closurePos: number) {
    this.l = l;
    this.r = r;
    this.closurePos = Math.max(0, Math.min(closurePos, r.length));
  }

  copy() {
    const c = new Item(this.l, this.r, this.closurePos);
    c.next = this.next;
    return c;
  }

  withNext(next: number) {
    this.next = next;
    return this;
  }

  getType(): "item" | "reduction" {
    if (this.closurePos == this.r.length) return "reduction";
    return "item";
  }

  prevSymbol() {
    if (this.closurePos > 0) return this.r[this.closurePos - 1];
  }

  nextSymbol() {
    if (this.closurePos < this.r.length) return this.r[this.closurePos];
  }

  stringRead() {
    if (this.closurePos === 0) {
      return this.l;
    }
    return this.r.slice(0, this.closurePos);
  }

  toString() {
    let prefix = "ni";
    if (this.getType() === "reduction") {
      prefix = `R${this.next ?? ""}`;
    } else if (this.next !== undefined) {
      prefix = `I${this.next}`;
    }
    return `${prefix}: ${this.l} -> ${this.r.slice(0, this.closurePos)}.${this.r.slice(this.closurePos)}`;
  }

  moveClosure(dir: "left" | "right" = "right") {
    return new Item(
      this.l,
      this.r,
      this.closurePos + (dir == "right" ? 1 : -1),
    );
  }

  equals(other: Item) {
    return (
      this.l === other.l &&
      this.r === other.r &&
      this.closurePos === other.closurePos
    );
  }

  equalSymsRead(other: Item) {
    return this.r.slice(0, this.closurePos) === other.r.slice(other.closurePos);
  }
}

export class LR0<T extends Grammar> {
  grammar: { S: string[] } & T;
  terms: string[]; // terminals, auto infered if not passed
  // firsts: T;
  // nexts: T;
  table: any;

  constructor(grammar: T, terms?: string[]) {
    this.grammar = { S: [Object.keys(grammar)[0]], ...grammar };
    this.terms = terms ?? this.getTerms();
    // this.firsts = this.getFirsts();
    // this.nexts = this.getNexts();
    this.table = this.getTable();
  }

  isTerm(w: string): boolean {
    return !/[A-Z]/.test(w);
  }

  getTerms(): string[] {
    const terms: string[] = [];
    for (const k in this.grammar) {
      if (this.grammar.hasOwnProperty(k)) {
        for (const prod of this.grammar[k]) {
          let i = 0;
          while (i < prod.length) {
            let termStr = "";
            while (i < prod.length && this.isTerm(prod[i])) {
              termStr += prod[i];
              i++;
            }
            if (termStr.length > 0) {
              terms.push(termStr);
            }
            i++;
          }
        }
      }
    }
    return terms;
  }

  getTerm(w: string): string {
    let i = 0;
    while (
      i <= w.length &&
      this.terms.some((t) => w.slice(0, i).startsWith(t))
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
      if (this.terms.some((t) => w[i].includes(t))) {
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

    const canonicals = this.getCanonical2();

    canonicals.map(({ items }) => {
      const row: Record<string, string> = {};

      for (const item of items) {
        if (item.getType() === "reduction") {
          if (this.isInitial(item.l)) {
            row["$"] = "acc";
          } else {
            const prevSym = item.prevSymbol();

            if (prevSym) {
              for (const term of this.nextOf(prevSym)) {
                if (row[term] && row[term].length > 0) {
                  throw new Error(`${term} already assigned`);
                }
                row[term] = `R(${item.r} -> ${item.l})`;
              }
            } else {
              throw new Error(`no prevSymbol for ${item.toString()}`);
            }
          }
        } else {
          const next = item.nextSymbol();
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
          const newItem = new Item(sym, prod, 0);

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

  getCanonical2() {
    const symbols = Object.keys(this.grammar);
    const initialItem = new Item(symbols[0], symbols[1], 0);
    const can = [
      {
        read: symbols[0],
        items: this.closure([initialItem]),
      },
    ];
    const itemsAdded = [...can[0].items];

    for (let i = 0; i < can.length; i++) {
      const { items } = can[i];
      for (const sym of [...symbols.slice(1), ...this.terms]) {
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

    can.forEach(({ read, items }, idx) => {
      console.log(`I${idx}: ${read}`);
      items.forEach((i) => console.log(`  ${i.toString()}`));
    });
    return can;
  }

  getCanonical() {
    const symbols = Object.keys(this.grammar);
    const augmSym0 = symbols[0];
    const sym0 = symbols[1];
    const can = {} as Record<string, Item[]>; // key represents the read string in the state
    let idCounter = 0;

    // I0
    const initialItem = new Item(augmSym0, sym0, 0);
    can[augmSym0] = this.closure([initialItem]).map((i) => {
      i.next = idCounter++;
      return i;
    });

    const findItemInCan = (item: Item) => {
      for (const state in can) {
        for (const i of can[state]) {
          if (i.equals(item)) return i;
        }
      }
    };
    const processed: Item[] = [];
    const toProcess = new Queue<Item>(initialItem);

    while (toProcess.length > 0) {
      const qItem = toProcess.dequeue();
      const read = qItem.stringRead();

      const canItem = findItemInCan(qItem);
      if (!canItem) {
        qItem.next = idCounter++;
      } else if (canItem.next === undefined) {
        canItem.next = idCounter++;
        qItem.next = canItem.next;
      } else {
        qItem.next = canItem.next;
      }
      if (!can[read]) {
        can[read] = [];
      }
      const state = can[read];
      for (const item of state) {
        const nextClosure = item.moveClosure();
        const alreadyProcessed =
          processed.findIndex((p) => p.equals(nextClosure)) !== -1;
        if (!alreadyProcessed) {
          const clos = this.closure([nextClosure]);
          const strRead = nextClosure.stringRead();
          if (can[strRead]) {
            can[strRead].push(...clos);
          } else {
            can[strRead] = clos;
          }

          clos.forEach((newItem) => toProcess.enqueue(newItem));
          processed.push(nextClosure);
        }
      }
    }

    Object.entries(can).forEach(([c, itArr]) => {
      itArr.forEach((i) => {
        if (i.next === undefined) {
          throw new Error(
            `item ${i.toString()} doesn't have an next in '${c}'`,
          );
        }
      });
    });

    let str = "";
    Object.keys(can).forEach((c, idx) => {
      str += `I${idx}: ${c}\n`;
      can[c].forEach((item) => {
        str += `  ${item.toString()}\n`;
      });
    });

    return {
      canonicals: can,
      str,
    };
  }

  print_analysis(): void {
    // for (const [k, v] of Object.entries(this.firsts)) {
    //   console.log(`first[${k}] = ${v}`);
    // }
    for (const k in this.grammar) {
      console.log(`next[${k}] = ${this.nextOf(k)}`);
    }
  }

  parse(str: string) {
    str += "$";
  }
}

export const lr0 = new LR0(G1);
// lr0.print_analysis();
// lr0.parse("i+i*(i*i)");
