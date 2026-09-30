import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#b42318', background: '#fdeceb', minHeight: '100vh' }}>
          <h2>Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#666' }}>{this.state.error.stack}</pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/app' }}
            style={{ marginTop: 16, padding: '8px 20px', background: '#b42318', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Reset & Kembali
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
