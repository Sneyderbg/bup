import { For, Show, type Accessor } from "solid-js";
import { Presence, Motion } from "solid-motionone";
import type { ParsingStep } from "../parser/parser";
import { colorFromIdx } from "../utils";

export function ParsingSteps({
  parsingSteps,
}: {
  parsingSteps: Accessor<ParsingStep[]>;
}) {
  return (
    <div class="flex w-full justify-center overflow-x-hidden">
      <Presence exitBeforeEnter>
        <Show when={parsingSteps().length > 0}>
          <Motion.div
            initial={{
              opacity: 0,
              x: "-20%",
            }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{
              opacity: 0,
              x: "20%",
            }}
          >
            <table>
              <thead>
                <tr>
                  <th class="px-4 py-1">#</th>
                  <For each={Object.keys(parsingSteps()[0])}>
                    {(k) => <th class="px-4 py-1">{k}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={parsingSteps()}>
                  {(step, idx) => (
                    <tr>
                      <td class="px-4 py-1">{idx()}</td>
                      <For each={Object.values(step)}>
                        {(v) => {
                          let color =
                            v[0] === "R"
                              ? colorFromIdx(parseInt(v.slice(1)))
                              : undefined;
                          if (v === "acc") color = "#008800";
                          if (v === "err") color = "#aa0000";
                          return (
                            <td
                              class="text-left px-4 py-1"
                              style={{ "background-color": color }}
                            >
                              {v}
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Motion.div>
        </Show>
      </Presence>
    </div>
  );
}
