"use client"

import { useState, useEffect, useRef } from "react"
import "./ChatComponent.css"

const ChatComponent = ({ socketService, isAuthenticated }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const chatInputRef = useRef(null)

  useEffect(() => {
    console.log("🔧 ChatComponent useEffect - Configuration des gestionnaires...")
    console.log("🔧 socketService:", socketService)
    console.log("🔧 isAuthenticated:", isAuthenticated)

    if (!socketService || !isAuthenticated) {
      console.log("⚠️ Pas de socketService ou pas authentifié, arrêt de la configuration")
      return
    }

    const handleChatMessage = (messageData) => {
      console.log("💬 ChatComponent - handleChatMessage appelé avec:", messageData)
      const message = typeof messageData === "string" ? JSON.parse(messageData) : messageData
      console.log("💬 ChatComponent - Message traité:", message)

      setMessages((prev) => {
        console.log("💬 ChatComponent - Messages précédents:", prev)
        const newMessages = [...prev, message]
        console.log("💬 ChatComponent - Nouveaux messages:", newMessages)
        return newMessages
      })

      if (!isOpen) {
        setUnreadCount((prev) => prev + 1)
        console.log("💬 ChatComponent - Compteur non lus incrémenté")
      }
    }

    const handleChatHistory = (historyData) => {
      console.log("📜 ChatComponent - handleChatHistory appelé avec:", historyData)
      const history = typeof historyData === "string" ? JSON.parse(historyData) : historyData
      console.log("📜 ChatComponent - Historique traité:", history)
      setMessages(history)
    }

    console.log("📡 ChatComponent - Enregistrement des gestionnaires...")
    socketService.on("chatMessage", handleChatMessage)
    socketService.on("chatHistory", handleChatHistory)

    return () => {
      console.log("🧹 ChatComponent - Nettoyage des gestionnaires...")
      socketService.off("chatMessage", handleChatMessage)
      socketService.off("chatHistory", handleChatHistory)
    }
  }, [socketService, isAuthenticated, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !socketService) return

    console.log("📤 ChatComponent - Envoi du message:", newMessage.trim())
    socketService.sendChatMessage(newMessage)
    setNewMessage("")

    if (chatInputRef.current) {
      chatInputRef.current.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleChat = () => {
    console.log("🔄 ChatComponent - Toggle chat, isOpen:", !isOpen)
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0)
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus()
        }
      }, 100)
    }
  }

  const getMessageTypeClass = (type) => {
    switch (type) {
      case "system":
        return "message-system"
      case "notification":
        return "message-notification"
      default:
        return "message-user"
    }
  }

  console.log("🖼️ ChatComponent - Rendu avec:", {
    isAuthenticated,
    messagesCount: messages.length,
    isOpen,
    unreadCount,
  })

  if (!isAuthenticated) {
    console.log("❌ ChatComponent - Pas authentifié, pas de rendu")
    return null
  }

  return (
    <div className={`chat-widget ${isOpen ? "chat-open" : "chat-closed"}`}>
      <button className="chat-toggle-btn" onClick={toggleChat} title={isOpen ? "Fermer le chat" : "Ouvrir le chat"}>
        💬{unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>💬 Chat en direct</h3>
            <button className="chat-close-btn" onClick={toggleChat} title="Fermer le chat">
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>Aucun message pour le moment</p>
                <small>Commencez la conversation !</small>
              </div>
            ) : (
              messages.map((message, index) => {
                console.log("🎨 Rendu du message:", message)
                return (
                  <div key={message.id || index} className={`message ${getMessageTypeClass(message.type)}`}>
                    {message.type !== "system" && <div className="message-sender">{message.senderName}</div>}
                    <div className="message-content">{message.message}</div>
                    <div className="message-time">{message.timestamp}</div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <textarea
              ref={chatInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              className="chat-input"
              rows="2"
              maxLength="500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="chat-send-btn"
              title="Envoyer le message"
            >
              📤
            </button>
          </div>

          <div className="chat-footer">
            <small>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatComponent
