"use client";

import dynamic from "next/dynamic";
import ProtectedRoute from "./ProtectedRoute";

// Disable SSR for ProtectedRoute to avoid prerender errors
const ProtectedRouteNoSSR = dynamic(
  () => Promise.resolve(ProtectedRoute),
  { ssr: false }
);

export default ProtectedRouteNoSSR;

