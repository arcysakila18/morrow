"use client";
import { useConnect, type Connector } from "wagmi";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { humanizeError } from "@/lib/errors";
import { walletConnectEnabled } from "@/lib/wagmi";
import { create } from "@/hooks/store";

export const walletModalStore = create(false);
export const openWalletModal = () => walletModalStore.set(true);

function label(c: Connector) {
  if (c.id === "injected") return "Browser wallet";
  if (c.id === "walletConnect") return "WalletConnect";
  return c.name;
}

function hint(c: Connector) {
  if (c.id === "walletConnect") return "Robinhood Wallet & mobile wallets";
  if (c.id === "injected") return "Detected extension";
  return "Detected";
}

export function WalletModal() {
  const open = walletModalStore.use();
  const { connectors, connectAsync, isPending, variables, error, reset } = useConnect();
  const close = () => {
    walletModalStore.set(false);
    reset();
  };

  // Prefer EIP-6963 discovered wallets; hide the generic injected entry when specific ones exist.
  const discovered = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const list = [...discovered, ...connectors.filter((c) => (c.id === "injected" ? discovered.length === 0 : c.type !== "injected"))];

  return (
    <Modal open={open} onClose={close} title="Connect a wallet">
      <div className="space-y-2 px-5 pb-2 pt-2">
        {list.map((c) => {
          const pending = isPending && (variables?.connector as Connector | undefined)?.uid === c.uid;
          return (
            <button
              key={c.uid}
              disabled={isPending}
              onClick={async () => {
                try {
                  await connectAsync({ connector: c });
                  close();
                } catch {}
              }}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left transition hover:border-line-strong hover:bg-surface-2 disabled:opacity-60"
            >
              {c.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" className="h-9 w-9 rounded-xl" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-xs font-semibold">{label(c).slice(0, 2)}</span>
              )}
              <span className="flex-1">
                <span className="block text-[15px] font-medium">{label(c)}</span>
                <span className="block text-xs text-muted">{hint(c)}</span>
              </span>
              {pending && <Spinner className="h-4 w-4 text-muted" />}
            </button>
          );
        })}
        {!walletConnectEnabled && (
          <p className="px-1 pt-1 text-xs leading-relaxed text-faint">
            WalletConnect (Robinhood Wallet on mobile) is unavailable until the site operator sets a WalletConnect project id.
          </p>
        )}
        {error && <p className="px-1 text-[13px] text-down">{humanizeError(error)}</p>}
      </div>
      <p className="border-t border-line px-5 py-4 text-xs leading-relaxed text-muted">
        MORROW is non-custodial. It will never ask for your seed phrase or private key. Connecting does not switch your network.
      </p>
    </Modal>
  );
}
