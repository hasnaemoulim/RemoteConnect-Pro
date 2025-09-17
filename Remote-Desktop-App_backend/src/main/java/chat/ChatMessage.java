package main.java.chat;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ChatMessage {
    private String id;
    private String senderId;
    private String senderName;
    private String message;
    private LocalDateTime timestamp;
    private String type; // "text", "system", "notification"

    public ChatMessage(String senderId, String senderName, String message, String type) {
        this.id = java.util.UUID.randomUUID().toString().substring(0, 8);
        this.senderId = senderId;
        this.senderName = senderName;
        this.message = message;
        this.type = type;
        this.timestamp = LocalDateTime.now();
    }

    // Getters
    public String getId() { return id; }
    public String getSenderId() { return senderId; }
    public String getSenderName() { return senderName; }
    public String getMessage() { return message; }
    public String getType() { return type; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public String getFormattedTimestamp() {
        return timestamp.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    public String toJson() {
        return String.format(
                "{\"id\":\"%s\",\"senderId\":\"%s\",\"senderName\":\"%s\",\"message\":\"%s\",\"type\":\"%s\",\"timestamp\":\"%s\"}",
                id, senderId, senderName, message.replace("\"", "\\\""), type, getFormattedTimestamp()
        );
    }
}
