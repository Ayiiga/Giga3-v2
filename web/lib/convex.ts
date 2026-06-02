"use client";

import { ConvexReactClient } from "convex/react";
import { getConvexUrl, requireConvexUrl } from "./convex/env";

const url = getConvexUrl();

export const convex = url ? new ConvexReactClient(url) : null;

export { getConvexUrl, getConvexSiteUrl, requireConvexUrl } from "./convex/env";
