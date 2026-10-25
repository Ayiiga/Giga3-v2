export const AWARDS_BANNER_DISMISS_KEY = "giga3_awards_banner_dismissed_v1";

export const AWARDS_PATHS = {
  home: "/gigasocial/awards/",
  nominate: "/gigasocial/awards/nominate/",
  candidate: "/gigasocial/awards/candidate/",
  gigasocialTab: "/gigasocial/?tab=creator&creatorTab=awards",
} as const;

export function candidateSharePath(args: {
  displayCode: string;
  shareToken: string;
}): string {
  const q = new URLSearchParams({
    code: args.displayCode,
    t: args.shareToken,
  });
  return `${AWARDS_PATHS.candidate}?${q.toString()}`;
}

export const PACKAGE_DISCLAIMER =
  "Promotional packages never generate votes, change judges’ scores, unlock easier assessments, or guarantee finalist status or victory.";

export const TIP_DISCLAIMER =
  "Tips are voluntary support for the creator. They do not purchase votes and do not affect rankings or judging.";
