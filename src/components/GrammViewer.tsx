import { createEffect, createSignal, Index, type Setter } from "solid-js";
import {
  gramm2Flat,
  GRAMMAR,
  type FlatGrammar,
  type Grammar,
} from "../parser/gramms";
import { colorFromIdx } from "../utils";
import { LR0, ValidationError } from "../parser/parser";
import debounce from "debounce";
import { Icon } from "@iconify-icon/solid";
import { Popover } from "./Popover";

export function GrammViewer({
  updateParser,
}: {
  updateParser: Setter<LR0<Grammar>>;
}) {
  const [flatGramm, setFlatGramm] = createSignal<FlatGrammar>(
    gramm2Flat(GRAMMAR),
  );
  const [error, setError] = createSignal<{
    prodIdx: number;
    msg: string;
    el?: HTMLElement;
    show: boolean;
  }>({ prodIdx: -1, msg: "aaaaaaaa", show: false });
  let prodRefs: Array<HTMLElement> = [];

  const rebuildParser = debounce(() => {
    try {
      const newParser = LR0.fromFlatGrammar(flatGramm());
      updateParser(newParser);
      setError((prev) => ({ ...prev, show: false }));
    } catch (err) {
      if (err instanceof ValidationError) {
        const lastError = {
          prodIdx: err.cause.atProdIdx,
          msg: err.message,
          el: prodRefs[err.cause.atProdIdx],
          show: true,
        };
        setError(lastError);
        return;
      }
      console.error(err);
    }
  }, 1000);

  const handleChange = (
    e: InputEvent & { target: HTMLInputElement },
    i: number,
  ) => {
    const modProd = e.target.value.split("→");
    if (modProd[0]?.trim().length === 0 || modProd[1]?.trim().length === 0)
      return;

    setFlatGramm((prev) => {
      const newG = [...prev];
      newG[i] = {
        symbol: modProd[0].trim() ?? "",
        prod: modProd[1]?.trim() ?? "",
      };
      return newG;
    });
  };

  createEffect(() => {
    if (flatGramm().length > 0) {
      rebuildParser();
    }
  });

  return (
    <div class="flex flex-col h-4/5 overflow-x-visible">
      <h1>Grammar</h1>
      <div class="box-border grid grid-cols-[.2fr_1.8fr] px-3 py-2 gap-1 h-auto font-bold overflow-y-auto overflow-x-hidden thin-scrollbar">
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
                <div
                  ref={(el) => (prodRefs[idx] = el)}
                  id={"d" + idx}
                  class="relative inline-block hover:scale-105 focus:border-r-gray-400 transition-all ease-out duration-100"
                >
                  <input
                    data-prod-idx={idx.toString()}
                    value={`${item().symbol.toString()} \u{2192} ${item().prod}`}
                    onInput={(e) => handleChange(e, idx)}
                    class="rounded-sm py-1 px-2"
                    style={{ "background-color": color }}
                  />
                  <button
                    class="absolute z-1 right-0 top-1/2 -translate-y-1/2 bg-black/2 hover:bg-black/20 p-2.5 aspect-square transition-colors"
                    onClick={() =>
                      setFlatGramm((prev) => {
                        const newG = [...prev];
                        newG.splice(idx, 1);
                        return newG;
                      })
                    }
                  >
                    <Icon icon="material-symbols:remove" />
                  </button>
                </div>
              </>
            );
          }}
        </Index>
        <button
          class="mr-2 py-1.5 px-2.5 rounded-md"
          style={{ "background-color": colorFromIdx(flatGramm().length) }}
          onClick={() => {
            setFlatGramm((prev) => [...prev, { symbol: "", prod: "" }]);
          }}
        >
          +
        </button>
      </div>
      <Popover targetEl={() => error().el} show={() => error().show}>
        <div>{error().msg}</div>
      </Popover>
    </div>
  );
}
