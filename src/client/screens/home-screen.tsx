import { Library, type LucideIcon, User, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Spinner } from "../components/spinner";
import { vi } from "../lib/strings-vi";

type Props = {
  connected: boolean;
  onSolo: () => void;
  onParty: () => void;
  onLibrary: () => void;
};

function Entry({
  icon: Icon,
  title,
  hint,
  main,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  main?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const style = main
    ? "bg-cta text-ink shadow-button-cta enabled:active:shadow-button-pressed-cta"
    : "bg-surface text-text border-2 border-outline shadow-card enabled:active:shadow-none";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring flex min-h-24 w-full items-center gap-4 rounded-button px-5 py-4 text-left transition-[transform,box-shadow] duration-100 enabled:active:translate-y-1 disabled:opacity-45 ${style}`}
    >
      <Icon size={32} strokeWidth={2.25} aria-hidden className="shrink-0" />
      <span className="flex flex-col">
        <span className="font-display text-h2 font-bold">{title}</span>
        <span className={`text-small ${main ? "text-ink" : "text-text-muted"}`}>{hint}</span>
      </span>
    </button>
  );
}

export function HomeScreen({ connected, onSolo, onParty, onLibrary }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main className="mx-auto flex w-full max-w-[520px] flex-1 animate-enter flex-col justify-center gap-6 px-4 py-8 md:px-6">
        <div className="text-center">
          <h1 ref={headingRef} tabIndex={-1} className="font-display text-display font-extrabold text-cta outline-none">
            {vi.app.title}
          </h1>
          <p className="text-body text-text-muted">{vi.app.tagline}</p>
        </div>
        <div className="flex flex-col gap-4">
          <Entry icon={User} title={vi.home.solo} hint={vi.home.soloHint} disabled={!connected} onClick={onSolo} />
          <Entry icon={Users} title={vi.home.party} hint={vi.home.partyHint} main disabled={!connected} onClick={onParty} />
          <Entry icon={Library} title={vi.home.library} hint={vi.home.libraryHint} onClick={onLibrary} />
        </div>
        <div className="flex min-h-12 items-center justify-center gap-2 text-small text-text-muted" aria-live="polite">
          {connected ? null : (
            <>
              <Spinner size={20} />
              <span>
                {vi.connection.waking} {vi.connection.wakingHint}
              </span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
