import { Component } from "react";

// Zachytí chybu z podstromu, aby nespadla celá stránka (typicky pád Google mapy / WebGL).
// Když není zadán `fallback`, vykreslí nic (podstrom prostě zmizí, zbytek stránky žije dál).
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Necháme v konzoli, ať je vidět příčina i v produkci.
    console.error("[ErrorBoundary] zachycena chyba v podstromu:", error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
