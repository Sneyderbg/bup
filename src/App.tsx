import { createSignal, For } from "solid-js";
import "./App.css";
import { lr0 } from "./parser/parser";

function App() {
  const [str, setStr] = createSignal("");

  const rows = lr0.table;
  const cols = [...lr0.terms, "$", ...Object.keys(lr0.grammar)];

  return (
    <div>
      <div>
        <input
          value={str()}
          onChange={(e) => setStr(e.target.value)}
          class="border"
        />
        <button onClick={() => alert(str())}>Parse!</button>
      </div>
      <div>
        <table>
          <thead>
            <tr>
              <th>Table LR(0)</th>
              <For each={cols}>{(n) => <th>{n}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={rows}>
              {(row, idx) => (
                <>
                  <tr>
                    <td>{idx()}</td>
                    <For each={cols}>
                      {(col) => (
                        <td class={lr0.isTerm(col) ? "w-32" : "w-8"}>
                          {row[col]}
                        </td>
                      )}
                    </For>
                  </tr>
                </>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
