import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString()
}

export default function Chat({ session }) {
  const { conversationId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [otherUserLabel, setOtherUserLabel] = useState(
    location.state?.otherUserLabel || 'Chat'
  )
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    fetchOtherUser()

    // Subscribe to realtime new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when messages update
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchOtherUser = async () => {
    if (location.state?.otherUserLabel) return // already have it

    const { data } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', session.user.id)
      .single()

    if (data?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('id', data.user_id)
        .single()

      if (profile) {
        setOtherUserLabel(profile.username || profile.email || data.user_id.slice(0, 8))
      }
    }
  }

  const fetchMessages = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
    } else {
      setMessages(data || [])
    }

    setLoading(false)
  }

  const sendMessage = async () => {
    const content = newMsg.trim()
    if (!content || sending) return

    setSending(true)
    setNewMsg('')

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: content,
      })

    if (error) {
      console.error('Error sending message:', error)
      setNewMsg(content) // restore message on failure
      alert('Failed to send message. Please try again.')
    }

    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date for dividers
  let lastDate = null

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/chats')}>
          ←
        </button>
        <div
          className="avatar"
          style={{
            width: 38, height: 38, fontSize: 16,
            background: 'rgba(255,255,255,0.25)',
            flexShrink: 0
          }}
        >
          {otherUserLabel[0]?.toUpperCase() || '?'}
        </div>
        <div className="chat-title">
          <h3>{otherUserLabel}</h3>
          <span>tap to view info</span>
        </div>
      </div>

      <div className="messages-area">
        {loading && (
          <div className="loading-text">Loading messages...</div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 }}>
            No messages yet. Say hi! 👋
          </div>
        )}

        {messages.map((msg) => {
          const isSent = msg.sender_id === session.user.id
          const msgDate = formatDate(msg.created_at)
          const showDateDivider = msgDate !== lastDate
          lastDate = msgDate

          return (
            <div key={msg.id}>
              {showDateDivider && (
                <div className="date-divider">{msgDate}</div>
              )}
              <div className={`msg-bubble-wrap ${isSent ? 'sent' : 'received'}`}>
                <div className="msg-bubble">
                  {msg.content}
                </div>
                <div className="msg-time">{formatTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!newMsg.trim() || sending}
        >
          ➤
        </button>
      </div>
    </div>
  )
}
