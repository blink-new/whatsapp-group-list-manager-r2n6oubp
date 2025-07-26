import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import Dashboard from './pages/Dashboard'
import CreateList from './pages/CreateList'
import ListEditor from './pages/ListEditor'
import SharedList from './pages/SharedList'
import { GuestLogin } from './components/GuestLogin'
import { Toaster } from './components/ui/toaster'

interface User {
  id: string
  email: string
  displayName?: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public shared list route */}
          <Route path="/shared/:shareToken" element={<SharedList />} />
          
          {/* Main app routes - work for both guest and authenticated users */}
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/create" element={<CreateList user={user} />} />
          <Route path="/edit/:listId" element={<ListEditor user={user} />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  )
}

export default App