import { createSignal, Index } from "solid-js";
import { gramm2Flat, GRAMMAR, type FlatGrammar } from "../parser/gramms";
import { colorFromIdx } from "../utils";

export function GrammViewer({
  rebuildParser,
}: {
  rebuildParser: (gramm: FlatGrammar) => void;
}) {
  const [flatGramm, setFlatGramm] = createSignal<FlatGrammar>(
    gramm2Flat(GRAMMAR),
  );

  const handleChange = (
    e: InputEvent & { target: HTMLInputElement },
    i: number,
  ) => {
    const modProd = e.target.value.split("→");
    setFlatGramm((prev) => {
      const newG = [...prev];
      newG[i] = {
        symbol: modProd[0].trim() ?? "",
        prod: modProd[1]?.trim() ?? "",
      };
      return newG;
    });

    rebuildParser(flatGramm());
  };

  return (
    <div>
      <h1>Grammar</h1>
      <div class="grid grid-cols-[.2fr_1.8fr] gap-1 font-bold">
        <Index each={flatGramm()}>
          {(item, idx) => {
            const color = colorFromIdx(idx);
            return (
              <>
                <span
                  class="mr-2 py-1.5 px-2.5 rounded-md"
                  style={{ "background-color": color }}
                >
                  {idx}
                </span>
                <input
                  value={`${item().symbol.toString()} \u{2192} ${item().prod}`}
                  onInput={(e) => handleChange(e, idx)}
                  class="inline-block rounded-sm py-1 px-2"
                  style={{ "background-color": color }}
                />
              </>
            );
          }}
        </Index>
        {/* <button */}
        {/*   class="mr-2 py-1.5 px-2.5 rounded-md" */}
        {/*   style={{ "background-color": colorFromIdx(flatGramm().length) }} */}
        {/* > */}
        {/*   + */}
        {/* </button> */}
      </div>
    </div>
  );
}
