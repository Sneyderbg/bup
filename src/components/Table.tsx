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
  const cols = () => [...parser().terms, "$", ...Object.keys(parser().grammar)];

  return (
    <table>
      <thead>
        <tr>
          <th>Table LR</th>
          <For each={cols()}>
            {(n) => (
              <Motion.th
                initial={{ "background-color": "#cc4400" }}
                animate={{ "background-color": "transparent" }}
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
                <td>{idx()}</td>
                <For each={cols()}>
                  {(col) => {
                    const value = row[col];
                    const color =
                      value && value[0] === "R"
                        ? colorFromIdx(parseInt(value.slice(1)))
                        : undefined;
                    return (
                      <td
                        class={parser().isTerm(col) ? "w-32" : "w-8"}
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
  );
}
