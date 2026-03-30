import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReload() {
    window.location.reload();
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#f2f2f2] to-white flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="text-red-500 w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#404040] mb-2">Algo ha ido mal</h1>
            <p className="text-gray-500 text-sm mb-6">
              Ha ocurrido un error inesperado. Puedes intentar recargar la página o volver al inicio.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040] font-semibold rounded-lg transition-colors"
              >
                Recargar página
              </button>
              <a
                href="/"
                className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-[#404040] font-medium rounded-lg transition-colors"
              >
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
