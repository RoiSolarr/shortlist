import Link from "next/link";
import { Logo } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-[var(--gutter)] py-16">
      <div className="enter-up flex max-w-md flex-col items-center text-center">
        <Logo className="size-8" />
        <p className="eyebrow mt-6">Page not found</p>
        <h1 className="t-page mt-2 text-balance">This page does not exist</h1>
        <p className="mt-3 text-ui text-muted">The job may have been deleted, or the link is wrong.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link href="/board" className="btn btn-primary">
            Go to the board
          </Link>
          <Link href="/" className="btn btn-quiet">
            Analyze a job
          </Link>
        </div>
      </div>
    </div>
  );
}
