import { ArrowLeft } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { vi } from "../lib/strings-vi";
import { IconButton } from "./game-button";

type Props = {
  title: string;
  onBack?: () => void;
  /** Hide the heading visually but keep it for screen readers and focus. */
  hideTitle?: boolean;
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * One screen: safe-area padding, a 520 px game column, a back button and a
 * heading that takes focus after a screen change.
 */
export function ScreenFrame({ title, onBack, hideTitle, right, footer, children, className = "" }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      <div className={`mx-auto flex w-full max-w-[520px] flex-1 flex-col px-4 md:px-6 ${className}`}>
        <header className="flex min-h-14 items-center gap-2 pt-2">
          {onBack ? <IconButton icon={ArrowLeft} label={vi.common.back} onClick={onBack} className="-ml-2" /> : null}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={`flex-1 font-display text-h2 font-bold outline-none ${hideTitle ? "sr-only" : ""}`}
          >
            {title}
          </h1>
          {right}
        </header>
        <main className="flex flex-1 animate-enter flex-col gap-4 pb-4">{children}</main>
      </div>
      {footer ? (
        <div className="sticky bottom-0 z-sticky bg-bg pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[520px] px-4 pt-3 md:px-6">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
