import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// A set of nice avatar background colors
const AVATAR_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#ff5722', '#607d8b'
]

function getAvatarColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(email) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

export default function ChatList({ session }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    setLoading(true)

    try {
      // Get all conversation IDs where the current user is a participant
      const { data: myParticipations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', session.user.id)

      if (partError) throw partError
      if (!myParticipations || myParticipations.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      const convIds = myParticipations.map(p => p.conversation_id)

      // Get all participants for those conversations (to find "the other person")
      const { data: allParticipants, error: allPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)
        .neq('user_id', session.user.id)

      if (allPartError) throw allPartError

      // Get profiles for those other users (using auth.users email as fallback)
      // We'll pull emails from profiles table if it exists, else use user_id
      const otherUserIds = [...new Set(allParticipants.map(p => p.user_id))]

      // Try fetching profiles table; if it doesn't exist we'll just use IDs
      let profileMap = {}
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', otherUserIds)

      if (profiles) {
        profiles.forEach(p => {
          profileMap[p.id] = p.username || p.email || p.id
        })
      }

      // Get last message for each conversation
      const convList = await Promise.all(convIds.map(async (convId) => {
        const otherParticipant = allParticipants.find(p => p.conversation_id === convId)
        const otherUserId = otherParticipant?.user_id
        const otherUserLabel = profileMap[otherUserId] || otherUserId?.slice(0, 8) + '...' || 'Unknown'

        const { data: lastMsgArr } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMsg = lastMsgArr?.[0]
        const lastMsgText = lastMsg
          ? (lastMsg.sender_id === session.user.id ? 'You: ' : '') + lastMsg.content
          : 'No messages yet'

        return {
          id: convId,
          otherUserId,
          otherUserLabel,
          lastMsg: lastMsgText,
          lastMsgAt: lastMsg?.created_at || null,
        }
      }))

      // Sort by most recent message
      convList.sort((a, b) => {
        if (!a.lastMsgAt) return 1
        if (!b.lastMsgAt) return -1
        return new Date(b.lastMsgAt) - new Date(a.lastMsgAt)
      })

      setConversations(convList)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="chatlist-page">
      <div className="chatlist-header">
        <div>
          <h2>💬 Chats</h2>
          <span>{session.user.email}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {loading ? (
        <div className="loading-text">Loading chats...</div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <div className="big-emoji">💭</div>
          <p>No conversations yet.</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>Ask your admin to add you to a chat!</p>
        </div>
      ) : (
        <div className="chat-list">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className="chat-list-item"
              onClick={() => navigate(`/chat/${conv.id}`, { state: { otherUserLabel: conv.otherUserLabel } })}
            >
              <div
                className="avatar"
                style={{ background: getAvatarColor(conv.otherUserLabel) }}
              >
                {getInitials(conv.otherUserLabel)}
              </div>
              <div className="chat-info">
                <div className="chat-name">{conv.otherUserLabel}</div>
                <div className="last-msg">{conv.lastMsg}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
