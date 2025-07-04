import { animate } from "@motionone/dom";
import {
  children,
  createEffect,
  observable,
  onCleanup,
  Show,
  type Accessor,
  type ParentProps,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";

export type PopoverProps = ParentProps & {
  show: Accessor<boolean>;
  targetEl: Accessor<HTMLElement | undefined>;
};

export function Popover(props: PopoverProps) {
  const resolved = children(() => props.children);
  let thisEl: HTMLDivElement;

  const updatePosition = () => {
    if (!thisEl) return;

    const target = props.targetEl();
    void target;
    if (!target) {
      thisEl.style.left = "50%";
      thisEl.style.top = "50%";

      return;
    }

    const rect = target.getBoundingClientRect();
    const parentRect = target.parentElement!.getBoundingClientRect();
    const pos = { x: rect.right + 8, y: rect.top + rect.height / 2 };

    const parentOffset = rect.top + rect.height / 2 - parentRect.top;
    if (parentOffset <= 0) {
      pos.y = parentRect.top;
    } else if (parentOffset >= parentRect.height) {
      pos.y = parentRect.top + parentRect.height;
    }

    animate(thisEl, { left: pos.x + "px", top: pos.y + "px" });
  };

  observable(props.targetEl).subscribe(() => {
    updatePosition();
  });

  createEffect(updatePosition);
  window.addEventListener("scroll", updatePosition, true);
  window.addEventListener("resize", updatePosition, true);

  onCleanup(() => {
    window.removeEventListener("scroll", updatePosition, true);
    window.removeEventListener("resize", updatePosition, true);
  });

  return (
    <Portal mount={document.body}>
      <Presence>
        <Show when={props.show()}>
          <Motion.div
            ref={(el) => {
              thisEl = el;
              updatePosition();
            }}
            class={
              "fixed origin-left -translate-y-1/2 bg-gray-800 shadow-md shadow-blue-400/60 px-2 py-1 z-10 border-2 border-r-blue-300 rounded-xs"
            }
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1 }}
          >
            {resolved()}
          </Motion.div>
        </Show>
      </Presence>
    </Portal>
  );
}
