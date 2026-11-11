import { Dices } from "lucide-react";
import { randomName } from "../lib/random-name";
import { vi } from "../lib/strings-vi";
import { GameButton } from "./game-button";

type Props = { onPick: (name: string) => void; disabled?: boolean };

/** Fills the name field with a random name for a quick start. */
export function RandomNameButton({ onPick, disabled }: Props) {
  return (
    <GameButton variant="ghost" icon={Dices} className="self-start" disabled={disabled} onClick={() => onPick(randomName())}>
      {vi.common.randomName}
    </GameButton>
  );
}
