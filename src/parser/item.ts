export class Item {
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
