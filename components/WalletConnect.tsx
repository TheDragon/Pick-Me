import { formatAddress } from "@/lib/formatAddress";

type WalletConnectProps = {
  enableMockWallet: boolean;
  useMockWallet: boolean;
  onUseMockWalletChange: (nextValue: boolean) => void;
  isConnected: boolean;
  address?: string;
  connectPending: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  mockAddress: string;
  onMockAddressChange: (value: string) => void;
};

export function WalletConnect({
  enableMockWallet,
  useMockWallet,
  onUseMockWalletChange,
  isConnected,
  address,
  connectPending,
  onConnectWallet,
  onDisconnectWallet,
  mockAddress,
  onMockAddressChange,
}: WalletConnectProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-panel/80 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Wallet</p>
          <p className="mt-1 text-base text-slate-200">
            {useMockWallet ? "Mock wallet mode" : isConnected ? formatAddress(address) : "Not connected"}
          </p>
        </div>

        {enableMockWallet ? (
          <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-slate-300">
            <input
              type="checkbox"
              checked={useMockWallet}
              onChange={(event) => onUseMockWalletChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800"
            />
            Mock mode
          </label>
        ) : null}
      </div>

      {useMockWallet ? (
        <div className="space-y-2">
          <label htmlFor="mockAddress" className="text-sm text-slate-300">
            Mock wallet address
          </label>
          <input
            id="mockAddress"
            value={mockAddress}
            onChange={(event) => onMockAddressChange(event.target.value)}
            placeholder="0x..."
            className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>
      ) : isConnected ? (
        <button
          type="button"
          onClick={onDisconnectWallet}
          className="w-full rounded-xl border border-border bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-danger hover:text-danger"
        >
          Disconnect Wallet
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnectWallet}
          disabled={connectPending}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {connectPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </section>
  );
}
