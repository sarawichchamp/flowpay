"use client";

import { useEffect } from "react";

export function usePwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);
}
