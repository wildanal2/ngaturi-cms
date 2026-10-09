"use client";

import { createContext, useContext } from "react";

export type LoadingPhase = "pending" | "leaving" | "complete";
export const LoadingContext = createContext<LoadingPhase>("complete");
export const useLoadingPhase = () => useContext(LoadingContext);
