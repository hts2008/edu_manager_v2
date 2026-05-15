import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("UI boundary caught an error", error, info);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-red-100 bg-white p-6 text-center shadow-lg">
        <h1 className="text-xl font-bold text-gray-900">
          Khong the hien thi man hinh nay
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Da co loi giao dien. Hay tai lai trang hoac quay ve tong quan.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Tai lai
          </button>
          <a href="/" className="btn-secondary">
            Ve tong quan
          </a>
        </div>
      </div>
    );
  }
}
