import { useEffect, useRef } from "react";

/**
 * Makes the browser / phone Back button close popups (book reader, bag, menus, confirmations)
 * instead of leaving the website.
 *
 * Opening a popup adds a history entry for the same page. Back removes that entry, and the
 * popup on top closes. Closing a popup with its own button removes its entry again, so the
 * history never fills up with steps that do nothing.
 */

type Entry = { close: () => void };

const stack: Entry[] = []; // open popups that have a history entry, oldest first
let queue: Entry[] = []; // popups waiting for their history entry
let stepsToRemove = 0; // entries of popups that closed themselves, removed together in one go
let pendingPops = 0; // history.go() calls we made ourselves and haven't seen arrive yet

function flush() {
  while (pendingPops === 0 && stepsToRemove === 0 && queue.length) {
    const entry = queue.shift()!;
    window.history.pushState({ ...(window.history.state ?? {}), popup: stack.length + 1 }, "");
    stack.push(entry);
  }
}

window.addEventListener("popstate", () => {
  if (pendingPops > 0) {
    // Our own clean-up after a popup closed itself.
    pendingPops--;
    flush();
    return;
  }
  // The visitor pressed Back: close the popup on top.
  stack.pop()?.close();
});

function open(entry: Entry) {
  queue.push(entry);
  flush();
}

function closedByButton(entry: Entry) {
  if (queue.includes(entry)) {
    queue = queue.filter((e) => e !== entry); // never got an entry: nothing to undo
    return;
  }
  const index = stack.indexOf(entry);
  if (index === -1) return;
  stack.splice(index, 1);
  // Several popups can close in the same moment (e.g. the reader and its checkout):
  // remove all their entries with a single history.go(-n).
  if (stepsToRemove++ === 0) {
    queueMicrotask(() => {
      const n = stepsToRemove;
      stepsToRemove = 0;
      pendingPops++;
      window.history.go(-n);
    });
  }
}

function forget(entry: Entry) {
  queue = queue.filter((e) => e !== entry);
  const index = stack.indexOf(entry);
  if (index !== -1) stack.splice(index, 1);
}

/**
 * While `open` is true, Back calls `onClose` instead of leaving the page.
 * Returns `closeForNavigation`: call it just before closing because a link is being followed,
 * so the link's navigation isn't undone by removing the popup's history entry.
 */
export function useBackToClose(open_: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const current = useRef<{ entry: Entry; keep: boolean } | null>(null);

  useEffect(() => {
    if (!open_) return;
    const state = {
      keep: false,
      entry: {
        close: () => {
          state.keep = true; // Back already removed the history entry
          onCloseRef.current();
        },
      } as Entry,
    };
    current.current = state;
    open(state.entry);
    return () => {
      if (state.keep) forget(state.entry);
      else closedByButton(state.entry);
      if (current.current === state) current.current = null;
    };
  }, [open_]);

  return () => {
    if (current.current) current.current.keep = true;
  };
}
