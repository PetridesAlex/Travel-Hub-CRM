import { Component } from 'react'
import Button from './ui/Button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
