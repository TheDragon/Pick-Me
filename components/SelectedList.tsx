import { formatAddress } from "@/lib/formatAddress";
import type { SelectedParticipant } from "@/lib/types";

type SelectedListProps = {
  selected: SelectedParticipant[];
};

const cardStyleByPosition: Record<number, string> = {
  1: "border-accent/70 bg-accent/10 shadow-glow",
  2: "border-sky-400/60 bg-sky-500/10",
  3: "border-indigo-400/60 bg-indigo-500/10",
};

export function SelectedList({ selected }: SelectedListProps) {
  const first = selected.find((entry) => entry.position === 1);
  const rest = selected.filter((entry) => entry.position !== 1).sort((a, b) => a.position - b.position);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200 md:text-2xl">Top 3 Selected</h2>
      <div className="space-y-4">
        <div
          className={[
            "rounded-2xl border p-6",
            first ? cardStyleByPosition[1] : "border-border bg-panel/60",
          ].join(" ")}
        >
          {first ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">#1 Winner</p>
              <p className="text-3xl font-bold md:text-4xl">{first.displayName}</p>
              <p className="text-lg text-slate-300">{formatAddress(first.address)}</p>
            </div>
          ) : (
            <p className="text-lg text-slate-400">Waiting for first selection...</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[2, 3].map((position) => {
            const item = rest.find((entry) => entry.position === position);
            return (
              <div
                key={position}
                className={[
                  "rounded-2xl border p-5",
                  item ? cardStyleByPosition[position] : "border-border bg-panel/60",
                ].join(" ")}
              >
                {item ? (
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">#{position}</p>
                    <p className="text-2xl font-semibold">{item.displayName}</p>
                    <p className="text-base text-slate-300">{formatAddress(item.address)}</p>
                  </div>
                ) : (
                  <p className="text-slate-400">Waiting for #{position}...</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
