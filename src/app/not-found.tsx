import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-28 text-center">
      <div className="text-[13px] font-medium text-muted">404</div>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Nothing here</h1>
      <Link href="/" className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Back to swap</Link>
    </div>
  );
}
