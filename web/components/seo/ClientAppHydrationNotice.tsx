type ClientAppHydrationNoticeProps = {
  productName: string;
  signInHref?: string;
};

/** Meaningful fallback while a client-only app chunk loads (also visible if JS is slow). */
export function ClientAppHydrationNotice({
  productName,
  signInHref = "/chat/login",
}: ClientAppHydrationNoticeProps) {
  return (
    <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-muted" role="status">
      Loading {productName}… Sign in at{" "}
      <a href={signInHref} className="font-medium text-accent underline underline-offset-2">
        {signInHref}
      </a>{" "}
      if you are not already signed in. The full editor opens after the app bundle loads.
    </p>
  );
}
