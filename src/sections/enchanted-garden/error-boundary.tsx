"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./enchanted-garden.module.css";

export class EnchantedGardenErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Enchanted Garden WebGL enhancement failed", error, info);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className={styles.fallback}
          data-enchanted-garden-error-fallback
          aria-hidden="true"
        />
      );
    }
    return this.props.children;
  }
}
