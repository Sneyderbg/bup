import { createSignal } from "solid-js";
import "./App.css";
import { LR0, type ParsingStep } from "./parser/parser";
import { GrammViewer } from "./components/GrammViewer";
import { ParsingSteps } from "./components/ParsingSteps";
import { GRAMMAR, type Grammar } from "./parser/gramms";
import { Table } from "./components/Table";

function App() {
  const [str, setStr] = createSignal("");
  const [parsingSteps, setParsingSteps] = createSignal<ParsingStep[]>([]);
  const [firstParsing, setFirstParsing] = createSignal<boolean | null>(null);
  const [parser, setParser] = createSignal<LR0<Grammar>>(new LR0(GRAMMAR));

  return (
    <div class="flex gap-8">
      <div class="sticky top-0 h-dvh self-start flex flex-col gap-8">
        <GrammViewer updateParser={setParser} />
        <form
          onSubmit={(e) => {
            {
              if (firstParsing() === null) {
                setFirstParsing(true);
              } else if (firstParsing()) {
                setFirstParsing(false);
              }
              e.preventDefault();
              setParsingSteps(parser().parse(str()));
            }
          }}
          class="flex flex-col gap-2 items-center"
        >
          <input
            value={str()}
            onChange={(e) => {
              setParsingSteps([]);
              setStr(e.target.value);
            }}
            class="!border-gray-400"
          />
          <button type="submit">Parse!</button>
        </form>
      </div>

      <div class="flex flex-col items-center gap-8">
        <Table parser={parser} />
        <ParsingSteps parsingSteps={parsingSteps} />
      </div>
    </div>
  );
}

export default App;
