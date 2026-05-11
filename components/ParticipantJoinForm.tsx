type ParticipantJoinFormProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onSaveName: () => void;
  isJoining: boolean;
  joined: boolean;
  isEditingName: boolean;
  onStartEditingName: () => void;
  onCancelEditingName: () => void;
};

export function ParticipantJoinForm({
  displayName,
  onDisplayNameChange,
  onSaveName,
  isJoining,
  joined,
  isEditingName,
  onStartEditingName,
  onCancelEditingName,
}: ParticipantJoinFormProps) {
  const isInputDisabled = joined && !isEditingName;
  const canSave = isEditingName && displayName.trim().length >= 2;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-panel/80 p-5 shadow-xl shadow-black/20">
      <div className="space-y-1">
        <label htmlFor="displayName" className="text-sm text-slate-300">
          Display name
        </label>
        <input
          id="displayName"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          maxLength={40}
          placeholder="e.g., Alice"
          disabled={isInputDisabled}
          className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </div>
      {!joined ? (
        <p className="text-xs text-slate-400">
          Auto-join starts when wallet is connected and name has at least 2 characters.
        </p>
      ) : isEditingName ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSaveName}
            disabled={isJoining || !canSave}
            className="w-full rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
          >
            {isJoining ? "Saving..." : "Save Name"}
          </button>
          <button
            type="button"
            onClick={onCancelEditingName}
            disabled={isJoining}
            className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartEditingName}
          className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-accent hover:text-accent"
        >
          Edit Name
        </button>
      )}
    </section>
  );
}
