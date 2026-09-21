"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./sekar-jawa-3d.module.css";

export class SekarJawa3DErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Sekar Jawa 3D WebGL enhancement failed", error, info);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className={styles.fallback}
          data-sekar-jawa-3d-error-fallback
          aria-hidden="true"
        />
      );
    }
    return this.props.children;
  }
}
