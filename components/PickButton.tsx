type PickButtonProps = {
  canPick: boolean;
  hasClicked: boolean;
  isSubmitting: boolean;
  onPick: () => void;
};

export function PickButton({ canPick, hasClicked, isSubmitting, onPick }: PickButtonProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={!canPick || hasClicked || isSubmitting}
      className="w-full rounded-2xl bg-accent px-6 py-5 text-2xl font-black tracking-wide text-surface transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 md:py-6"
    >
      {isSubmitting ? "Submitting..." : hasClicked ? "PICKED" : "PICK ME"}
    </button>
  );
}
