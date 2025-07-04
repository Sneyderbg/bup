import { For, type Accessor } from "solid-js";
import type { LR0 } from "../parser/parser";
import type { Grammar } from "../parser/gramms";
import { Motion } from "solid-motionone";
import { colorFromIdx } from "../utils";

export function Table<T extends Grammar>({
  parser,
}: {
  parser: Accessor<LR0<T>>;
}) {
  const rows = () => parser().table;
  const cols = () => [...parser().terms, ...Object.keys(parser().grammar)];

  return (
    <div>
      <h1>Table LR(0)</h1>
      <table class="m-2">
        <thead>
          <tr class="bg-gray-500/40">
            <th class="p-1">state</th>
            <For each={cols()}>
              {(n) => (
                <Motion.th
                  class="p-1 bg-orange-500"
                  animate={{ backgroundColor: "rgb(180,120,0,0%)" }}
                  transition={{ backgroundColor: { duration: 2 } }}
                >
                  {n}
                </Motion.th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {(row, idx) => (
              <>
                <tr>
                  <td class="bg-gray-800">{idx()}</td>
                  <For each={cols()}>
                    {(col) => {
                      const value = row[col];
                      const color =
                        value && value[0] === "R"
                          ? colorFromIdx(parseInt(value.slice(1)))
                          : undefined;
                      return (
                        <td
                          data-prod-idx={color ? value.slice(1) : undefined}
                          class="px-1 py-0.5"
                          style={{ "background-color": color }}
                        >
                          {value}
                        </td>
                      );
                    }}
                  </For>
                </tr>
              </>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
