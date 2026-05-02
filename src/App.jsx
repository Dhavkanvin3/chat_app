import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import ChatList from './pages/ChatList'
import Chat from './pages/Chat'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '16px', color: '#888' }}>Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/chats" replace /> : <Login />}
        />
        <Route
          path="/chats"
          element={session ? <ChatList session={session} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/chat/:conversationId"
          element={session ? <Chat session={session} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={session ? "/chats" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
