package main.java.chat;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import main.java.server.WebSocketClientHandler;

public class ChatManager {
    private List<ChatMessage> chatHistory = new CopyOnWriteArrayList<>();
    private static final int MAX_HISTORY = 100;

    public void addMessage(String senderId, String senderName, String message) {
        ChatMessage chatMessage = new ChatMessage(senderId, senderName, message, "text");

        chatHistory.add(chatMessage);

        if (chatHistory.size() > MAX_HISTORY) {
            chatHistory.remove(0);
        }

        System.out.println("💬 Message chat: " + senderName + " -> " + message);
    }

    public void addSystemMessage(String message) {
        ChatMessage systemMessage = new ChatMessage("system", "Système", message, "system");
        chatHistory.add(systemMessage);

        if (chatHistory.size() > MAX_HISTORY) {
            chatHistory.remove(0);
        }

        System.out.println("📢 Message système: " + message);
    }

    public List<ChatMessage> getChatHistory() {
        return new ArrayList<>(chatHistory);
    }

    public String getChatHistoryJson() {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < chatHistory.size(); i++) {
            json.append(chatHistory.get(i).toJson());
            if (i < chatHistory.size() - 1) {
                json.append(",");
            }
        }
        json.append("]");
        return json.toString();
    }

    public void broadcastMessage(ChatMessage message, List<WebSocketClientHandler> clients) {
        String messageJson = "CHAT_MESSAGE:" + message.toJson();

        clients.parallelStream().forEach(client -> {
            try {
                client.sendMessage(messageJson);
            } catch (Exception e) {
                // Ignorer les erreurs d'envoi
            }
        });
    }

    public void broadcastChatHistory(WebSocketClientHandler newClient) {
        String historyJson = "CHAT_HISTORY:" + getChatHistoryJson();
        try {
            newClient.sendMessage(historyJson);
        } catch (Exception e) {
            System.err.println("Erreur envoi historique chat: " + e.getMessage());
        }
    }

    public void notifyUserJoined(String userName, List<WebSocketClientHandler> clients) {
        addSystemMessage(userName + " a rejoint la session");
        ChatMessage joinMessage = chatHistory.get(chatHistory.size() - 1);
        broadcastMessage(joinMessage, clients);
    }

    public void notifyUserLeft(String userName, List<WebSocketClientHandler> clients) {
        addSystemMessage(userName + " a quitté la session");
        ChatMessage leaveMessage = chatHistory.get(chatHistory.size() - 1);
        broadcastMessage(leaveMessage, clients);
    }

    public void clearHistory() {
        chatHistory.clear();
        System.out.println("🗑️ Historique du chat effacé");
    }
}
