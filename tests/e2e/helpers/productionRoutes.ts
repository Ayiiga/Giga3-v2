export type ProductionRouteExpectation = {
  path: string;
  /** When true, meta robots should allow indexing; when false, must be noindex. */
  indexable: boolean;
  /** Minimum title length after load (hydrated or SSR). */
  minTitleLength?: number;
};

/** Core public production routes and intended indexability. */
export const PRODUCTION_PUBLIC_ROUTES: ProductionRouteExpectation[] = [
  { path: "/", indexable: true },
  { path: "/chat/", indexable: false },
  { path: "/gigalearn/", indexable: true },
  { path: "/gigasocial/", indexable: true },
  { path: "/media/", indexable: true },
  { path: "/gigaedit/", indexable: true },
  { path: "/marketplace/", indexable: true },
  { path: "/credits/", indexable: false },
  { path: "/pricing/", indexable: true },
  { path: "/trending/", indexable: true },
  { path: "/ghana-ai/", indexable: true },
  { path: "/blog/", indexable: true },
];
