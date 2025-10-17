"use client";

import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) {
    // Basic client-side logging; could be sent to /api/logs
    console.error("UI ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900">Ocorreu um erro inesperado</h2>
            <p className="text-gray-600 mt-2">Tente atualizar a página ou voltar para a tela inicial.</p>
            <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white" onClick={() => location.reload()}>Recarregar</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
