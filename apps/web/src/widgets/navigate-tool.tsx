"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function NavigateToolWidget({ path }: { path: string }) {
  const router = useRouter();
  useEffect(() => {
    router.push(path);
  }, [path, router]);
  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2 text-[12.5px] text-provost-text-secondary">
      Navigating to <span className="font-semibold text-provost-text-primary">{path}</span>…
    </div>
  );
}
