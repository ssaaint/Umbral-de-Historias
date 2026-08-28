import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Error inesperado de la aplicación:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="empty-state setup-notice">
            <p className="section-kicker">Umbral de Historias</p>
            <h1>No pudimos iniciar la aplicación.</h1>
            <p>
              Revisá la consola del navegador para ver el detalle técnico y
              recargá la página después de corregirlo.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
