import { StatusBadge } from "@/components/StatusBadge";

type HostControlsProps = {
  participantsCount: number;
  isPickOpen: boolean;
  isBusy: boolean;
  onOpenPick: () => void;
  onReset: () => void;
};

export function HostControls({ participantsCount, isPickOpen, isBusy, onOpenPick, onReset }: HostControlsProps) {
  return (
    <section className="rounded-2xl border border-border bg-panel/90 p-5 shadow-xl shadow-black/25 md:p-7">
      <div className="grid gap-4 md:grid-cols-3 md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Participants</p>
          <p className="mt-1 text-3xl font-bold md:text-4xl">{participantsCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Round Status</p>
          <div className="mt-2">
            <StatusBadge isOpen={isPickOpen} className="text-base" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <button
            type="button"
            onClick={onOpenPick}
            disabled={isPickOpen || isBusy}
            className="rounded-xl bg-accent px-5 py-3 text-lg font-semibold text-surface transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            Open Pick
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isBusy}
            className="rounded-xl border border-border bg-slate-900 px-5 py-3 text-lg font-semibold text-slate-100 transition hover:border-warning hover:text-warning disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
