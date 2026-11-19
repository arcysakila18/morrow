"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Spinner } from "@/components/ui/Spinner";
import { IconExternal } from "@/components/ui/Icons";
import { create } from "@/hooks/store";
import { SOL_WALLETS, connectSolana, getProvider, type SolWalletId } from "@/hooks/useSolanaWallet";
import { humanizeError } from "@/lib/errors";

export const solanaModalStore = create<boolean>(false);

/** Pick a Solana wallet. Installed wallets connect; on phones without one, open Morrow inside the wallet's browser. */
export function SolanaConnectModal() {
  const open = solanaModalStore.use();
  const [busy, setBusy] = useState<SolWalletId | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    setInstalled(Object.fromEntries(SOL_WALLETS.map((w) => [w.id, !!getProvider(w.id)])));
  }, [open]);

  const close = () => solanaModalStore.set(false);
  const connect = async (id: SolWalletId) => {
    setBusy(id);
    setErr(null);
    try {
      await connectSolana(id);
      close();
    } catch (e) {
      setErr(humanizeError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Connect a Solana wallet">
      <div className="space-y-2 px-4 pb-4 pt-1 sm:px-5">
        {SOL_WALLETS.map((w) => {
          const has = installed[w.id];
          const href = !has ? (mobile && w.browse ? w.browse(window.location.href) : w.site) : undefined;
          const body = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-3 text-[17px] font-semibold">{w.name[0]}</span>
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">{w.name}</span>
                <span className="block text-[13px] text-muted">{has ? "Detected" : mobile && w.browse ? `Open Morrow in ${w.name}` : "Not installed"}</span>
              </span>
              {busy === w.id ? <Spinner className="h-5 w-5" /> : !has && <IconExternal width={16} height={16} className="text-faint" />}
            </>
          );
          return has ? (
            <button key={w.id} onClick={() => connect(w.id)} disabled={!!busy} className="flex w-full items-center gap-3.5 rounded-[18px] border border-line px-3.5 py-3 text-left transition hover:border-lime/40 hover:bg-surface-2 disabled:opacity-60">
              {body}
            </button>
          ) : (
            <a key={w.id} href={href} target={mobile ? undefined : "_blank"} rel="noreferrer" className="flex w-full items-center gap-3.5 rounded-[18px] border border-line px-3.5 py-3 text-left transition hover:bg-surface-2">
              {body}
            </a>
          );
        })}
        {err && <p className="rounded-2xl bg-down/10 px-4 py-3 text-[13px] text-down">{err}</p>}
        <p className="flex items-start gap-2 px-1 pt-2 text-[12px] leading-relaxed text-faint">
          <ChainLogo chainId={101} size={14} className="mt-0.5 shrink-0" />
          Morrow only asks your wallet to sign transactions. It never sees your seed phrase or private key.
        </p>
      </div>
    </Modal>
  );
}
