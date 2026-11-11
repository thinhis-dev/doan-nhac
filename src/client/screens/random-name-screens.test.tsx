// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi as vitest } from "vitest";
import { DEFAULT_PARAMS } from "../../shared/protocol";
import { DEFAULT_SOURCE } from "../lib/song-filter";
import { vi } from "../lib/strings-vi";
import { PartyEntryScreen } from "./party-entry-screen";
import { SoloSetupScreen } from "./solo-setup-screen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NAME_PATTERN = /^\S+(?: \S+)* (?:[1-9]\d?|100)$/u;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vitest.restoreAllMocks();
});

function render(node: React.ReactNode) {
  act(() => root.render(node));
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`No button "${label}"`);
  return found;
}

function nameInput(label: string): HTMLInputElement {
  const found = [...container.querySelectorAll("label")].find((l) => l.textContent === label);
  const input = found && document.getElementById(found.htmlFor);
  if (!(input instanceof HTMLInputElement)) throw new Error(`No input "${label}"`);
  return input;
}

async function click(el: HTMLElement) {
  await act(async () => el.click());
}

describe("random name on the party entry screen", () => {
  const setup = () => {
    const onCreate = vitest.fn(async () => null);
    const onJoin = vitest.fn(async () => null);
    render(<PartyEntryScreen onBack={() => {}} onCreate={onCreate} onJoin={onJoin} />);
    return { onCreate, onJoin };
  };

  it("fills the name field with a random name", async () => {
    setup();
    await click(button(vi.common.randomName));
    expect(nameInput(vi.party.nameLabel).value).toMatch(NAME_PATTERN);
  });

  it("replaces a typed name and a new click gives the next random name", async () => {
    setup();
    const rng = vitest.spyOn(Math, "random");
    rng.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    await click(button(vi.common.randomName));
    const first = nameInput(vi.party.nameLabel).value;
    expect(first).toMatch(/ 1$/);
    rng.mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99);
    await click(button(vi.common.randomName));
    const second = nameInput(vi.party.nameLabel).value;
    expect(second).toMatch(/ 100$/);
    expect(second).not.toBe(first);
  });

  it("clears the missing-name error", async () => {
    setup();
    await click(button(vi.party.create));
    expect(container.textContent).toContain(vi.party.nameRequired);
    await click(button(vi.common.randomName));
    expect(container.textContent).not.toContain(vi.party.nameRequired);
  });

  it("creates a room with the random name and remembers it", async () => {
    const { onCreate } = setup();
    await click(button(vi.common.randomName));
    const name = nameInput(vi.party.nameLabel).value;
    await click(button(vi.party.create));
    expect(onCreate).toHaveBeenCalledWith(name);
    expect(localStorage.getItem("lastName")).toBe(name);
  });
});

describe("random name on the solo setup screen", () => {
  const setup = (starting = false) => {
    const onStart = vitest.fn();
    render(
      <SoloSetupScreen
        songs={[]}
        params={DEFAULT_PARAMS}
        onParams={() => {}}
        source={DEFAULT_SOURCE}
        onSource={() => {}}
        poolPlayable
        starting={starting}
        startError={null}
        onStart={onStart}
        onBack={() => {}}
      />,
    );
    return { onStart };
  };

  it("starts with the random name instead of the default name", async () => {
    const { onStart } = setup();
    await click(button(vi.common.randomName));
    const name = nameInput(vi.solo.nameLabel).value;
    expect(name).toMatch(NAME_PATTERN);
    await click(button(vi.solo.start));
    expect(onStart).toHaveBeenCalledWith(name);
    expect(localStorage.getItem("lastName")).toBe(name);
  });

  it("is disabled while the game is starting", () => {
    setup(true);
    expect(button(vi.common.randomName).disabled).toBe(true);
  });
});
