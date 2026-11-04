'use client';

import { Component, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string | null;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * ErrorBoundaryInner catches React render errors in its child tree,
 * shows a fallback UI instead of crashing the entire page, and automatically
 * resets whenever the route pathname (`resetKey`) changes.
 */
class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error & { digest?: string }): State {
    if (error?.digest?.startsWith?.('NEXT_REDIRECT')) {
      throw error;
    }
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: undefined });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-red-500 text-xl">⚠</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  let pathname: string | null = null;
  try {
    pathname = usePathname();
  } catch {
    pathname = null;
  }
  return <ErrorBoundaryInner {...props} resetKey={props.resetKey ?? pathname} />;
}

export default ErrorBoundary;
