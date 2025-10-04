import React from 'react';
import Button from './Button';
import Card, { CardHeader, CardTitle, CardContent } from './Card';
import { Heading, Text } from './Typography';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
    
    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Optionally reload the page
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card variant="elevated" className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3 text-red-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <CardTitle>Something Went Wrong</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Text>
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </Text>
              
              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <Text weight="semibold" className="text-red-800 mb-2">
                    Error Details:
                  </Text>
                  <pre className="text-xs text-red-700 overflow-auto max-h-64">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                  fullWidth
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  fullWidth
                >
                  Go to Home
                </Button>
              </div>
              
              <Text size="sm" variant="muted" className="text-center pt-2">
                If this problem persists, please contact support
              </Text>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
