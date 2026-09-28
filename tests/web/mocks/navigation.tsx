import type { ReactNode } from "react";

export const pushMock = { current: (_path: string) => undefined as void };
export const replaceMock = { current: (_path: string) => undefined as void };

export function useRouter() {
  return {
    push: (path: string) => pushMock.current(path),
    replace: (path: string) => replaceMock.current(path),
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export default function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href}>{children}</a>;
}
