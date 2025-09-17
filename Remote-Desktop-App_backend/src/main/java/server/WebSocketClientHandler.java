package main.java.server;

import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import main.java.control.ControlExecutor;

public class WebSocketClientHandler implements Runnable {
    private Socket socket;
    private InputStream input;
    private OutputStream output;
    private WebSocketServer server;
    private boolean isWebSocketConnected = false;
    private String clientId;
    private String clientIP;
    private ControlExecutor controlExecutor;
    private boolean isAuthenticated = false;
    private boolean connectionApproved = false;

    public WebSocketClientHandler(Socket socket, WebSocketServer server, String clientIP) throws IOException {
        this.socket = socket;
        this.server = server;
        this.clientIP = clientIP;
        this.input = socket.getInputStream();
        this.output = socket.getOutputStream();
        this.clientId = UUID.randomUUID().toString().substring(0, 8);
        this.controlExecutor = new ControlExecutor();
    }

    @Override
    public void run() {
        try {
            performWebSocketHandshake();

            if (isWebSocketConnected) {
                sendMessage("CLIENT_ID:" + clientId);
                String requestId = server.requestConnection(clientIP, this);
                sendMessage("CONNECTION_REQUEST:" + requestId);
                listenForMessages();
            }
        } catch (Exception e) {
            System.err.println("Erreur dans WebSocketClientHandler: " + e.getMessage());
        } finally {
            disconnect();
        }
    }

    private void performWebSocketHandshake() throws Exception {
        Scanner scanner = new Scanner(input, "UTF-8");
        String request = "";
        String line;

        while (scanner.hasNextLine()) {
            line = scanner.nextLine();
            request += line + "\r\n";
            if (line.isEmpty()) break;
        }

        Pattern keyPattern = Pattern.compile("Sec-WebSocket-Key: (.*)");
        Matcher matcher = keyPattern.matcher(request);

        if (matcher.find()) {
            String key = matcher.group(1).trim();
            String acceptKey = generateAcceptKey(key);

            String response = "HTTP/1.1 101 Switching Protocols\r\n" +
                    "Upgrade: websocket\r\n" +
                    "Connection: Upgrade\r\n" +
                    "Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n";

            output.write(response.getBytes("UTF-8"));
            output.flush();

            isWebSocketConnected = true;
            System.out.println("🤝 Handshake WebSocket réussi pour " + clientIP);
        }
    }

    private String generateAcceptKey(String key) throws Exception {
        String magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] hash = md.digest((key + magic).getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(hash);
    }

    private void listenForMessages() throws IOException {
        byte[] buffer = new byte[65536];
        while (isWebSocketConnected && !socket.isClosed()) {
            int bytesRead = input.read(buffer);
            if (bytesRead > 0) {
                String message = decodeWebSocketFrame(buffer, bytesRead);
                if (message != null) {
                    handleMessage(message);
                }
            }
        }
    }

    private String decodeWebSocketFrame(byte[] buffer, int length) {
        if (length < 2) return null;

        boolean masked = (buffer[1] & 0x80) != 0;
        int payloadLength = buffer[1] & 0x7F;
        int offset = 2;

        if (payloadLength == 126) {
            payloadLength = ((buffer[2] & 0xFF) << 8) | (buffer[3] & 0xFF);
            offset = 4;
        } else if (payloadLength == 127) {
            long extendedLength = 0;
            for (int i = 0; i < 8; i++) {
                extendedLength = (extendedLength << 8) + (buffer[2 + i] & 0xFF);
            }
            if (extendedLength > Integer.MAX_VALUE) {
                return null;
            }
            payloadLength = (int) extendedLength;
            offset = 10;
        }

        byte[] maskingKey = new byte[4];
        if (masked) {
            System.arraycopy(buffer, offset, maskingKey, 0, 4);
            offset += 4;
        }

        byte[] payload = new byte[payloadLength];
        System.arraycopy(buffer, offset, payload, 0, payloadLength);

        if (masked) {
            for (int i = 0; i < payloadLength; i++) {
                payload[i] ^= maskingKey[i % 4];
            }
        }

        return new String(payload, java.nio.charset.StandardCharsets.UTF_8);
    }

    // ✅ MÉTHODE HANDLEMESSAGE ADAPTÉE POUR LA CONCURRENCE
    private void handleMessage(String message) {
        try {
            if (message.startsWith("CHAT_MESSAGE:")) {
                String chatMessage = message.substring("CHAT_MESSAGE:".length());
                server.handleChatMessage(clientId, chatMessage);

            } else if (message.startsWith("FILE_UPLOAD_START:")) {
                String data = message.substring("FILE_UPLOAD_START:".length());
                String[] parts = data.split(":");
                if (parts.length >= 3) {
                    String fileName = parts[0];
                    long fileSize = Long.parseLong(parts[1]);
                    String fileType = parts[2];

                    String sessionId = server.startFileUpload(clientId, fileName, fileSize, fileType);
                    if (sessionId != null) {
                        sendMessage("UPLOAD_SESSION:" + sessionId);
                        System.out.println("📁 Session upload créée: " + sessionId + " pour " + fileName);
                    } else {
                        sendMessage("UPLOAD_ERROR:File too large or invalid");
                        System.out.println("❌ Upload refusé pour " + fileName + " (trop volumineux)");
                    }
                }

            } else if (message.startsWith("FILE_CHUNK:")) {
                String data = message.substring("FILE_CHUNK:".length());
                String[] parts = data.split(":", 3);
                if (parts.length >= 3) {
                    String sessionId = parts[0];
                    int chunkIndex = Integer.parseInt(parts[1]);
                    byte[] chunkData = Base64.getDecoder().decode(parts[2]);

                    boolean success = server.receiveFileChunk(sessionId, chunkIndex, chunkData);
                    sendMessage("CHUNK_ACK:" + sessionId + ":" + chunkIndex + ":" + success);

                    if (chunkIndex % 10 == 0) {
                        System.out.println("📦 Chunk " + chunkIndex + " reçu pour session " + sessionId);
                    }
                }

            } else if (message.equals("REQUEST_FILE_LIST")) {
                server.sendFileList(this);

            } else if (message.startsWith("DOWNLOAD_FILE:")) {
                String fileName = message.substring("DOWNLOAD_FILE:".length());
                server.startFileDownload(clientId, fileName, this);

            } else if (message.startsWith("REQUEST_CHUNK:")) {
                String data = message.substring("REQUEST_CHUNK:".length());
                String[] parts = data.split(":");
                if (parts.length >= 2) {
                    String sessionId = parts[0];
                    int chunkIndex = Integer.parseInt(parts[1]);
                    server.sendFileChunk(sessionId, chunkIndex, this);
                }

                // ✅ NOUVEAU : Gestion de la demande de liste des utilisateurs
            } else if (message.equals("REQUEST_USER_LIST")) {
                if (isAuthenticated) {
                    server.sendUserListToClient(this);
                } else {
                    sendMessage("NOT_AUTHENTICATED");
                }

                // ✅ GESTION : Fermeture de session par le client
            } else if (message.equals("END_SESSION")) {
                System.out.println("🔚 Demande de fermeture de session reçue du client: " + clientId);
                server.endClientSession(clientId, this);
                return;

            } else if (message.startsWith("AUTHENTICATE:")) {
                String authData = message.substring("AUTHENTICATE:".length());

                String password;
                String displayName;

                if (authData.contains(":")) {
                    String[] parts = authData.split(":", 2);
                    password = parts[0];
                    displayName = parts.length > 1 ? parts[1] : "User-" + clientId.substring(0, 4);
                } else {
                    password = authData;
                    displayName = "User-" + clientId.substring(0, 4);
                }

                System.out.println("🔐 Tentative d'authentification - Client: " + clientId + ", Password: " + password + ", DisplayName: " + displayName);

                if (server.authenticatePassword(clientId, password)) {
                    isAuthenticated = true;
                    server.authenticateClient(clientId, clientIP, displayName);
                    sendMessage("AUTHENTICATION_SUCCESS");
                    System.out.println("✅ Client authentifié: " + displayName + " (" + clientId + " - " + clientIP + ")");
                } else {
                    sendMessage("AUTHENTICATION_FAILED");
                    System.out.println("❌ Échec authentification: " + clientIP + " (mot de passe incorrect)");
                    disconnect();
                }
                return;
            }

            // Vérifier l'authentification pour les autres messages
            if (!isAuthenticated) {
                sendMessage("NOT_AUTHENTICATED");
                return;
            }

            // ✅ AMÉLIORATION : Gestion du contrôle avec file d'attente
            if (message.equals("REQUEST_CONTROL")) {
                boolean granted = server.requestControl(clientId);
                sendMessage("CONTROL_RESPONSE:" + granted);

                if (!granted) {
                    // Envoyer la position dans la file
                    int position = server.getControlQueue().getQueuePosition(clientId);
                    if (position > 0) {
                        sendMessage("QUEUE_POSITION:" + position);
                    }
                }

            } else if (message.equals("RELEASE_CONTROL")) {
                server.releaseControl(clientId);
                sendMessage("CONTROL_RESPONSE:false");

                // ✅ AMÉLIORATION : Gestion des événements d'entrée avec rafraîchissement d'activité
            } else if (message.startsWith("INPUT_EVENT:")) {
                if (server.hasControl(clientId)) {
                    String inputData = message.substring("INPUT_EVENT:".length());

                    // ✅ NOUVEAU : Rafraîchir l'activité pour éviter timeout
                    server.getControlQueue().refreshActivity(clientId);

                    // ✅ NOUVEAU : Log détaillé pour debug clavier
                    if (inputData.contains("KEY_")) {
                        System.out.println("🎯 Événement clavier reçu de " + clientId + ": " + inputData);
                    }

                    controlExecutor.executeInputEvent(inputData);
                } else {
                    System.out.println("⚠️ Tentative d'envoi d'événement sans contrôle: " + clientId);
                }

            } else if (message.equals("PING")) {
                sendMessage("PONG");
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur traitement message de " + clientId + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendMessage(String message) {
        sendMessageInternal(message, false);
    }

    public void sendMessageFast(String message) {
        sendMessageInternal(message, true);
    }

    private void sendMessageInternal(String message, boolean fast) {
        if (!isWebSocketConnected) return;

        try {
            byte[] messageBytes = message.getBytes("UTF-8");
            byte[] frame;

            if (messageBytes.length < 126) {
                frame = new byte[2 + messageBytes.length];
                frame[0] = (byte) 0x81;
                frame[1] = (byte) messageBytes.length;
                System.arraycopy(messageBytes, 0, frame, 2, messageBytes.length);
            } else if (messageBytes.length < 65536) {
                frame = new byte[4 + messageBytes.length];
                frame[0] = (byte) 0x81;
                frame[1] = 126;
                frame[2] = (byte) (messageBytes.length >> 8);
                frame[3] = (byte) (messageBytes.length & 0xFF);
                System.arraycopy(messageBytes, 0, frame, 4, messageBytes.length);
            } else {
                frame = new byte[10 + messageBytes.length];
                frame[0] = (byte) 0x81;
                frame[1] = 127;
                long len = messageBytes.length;
                for (int i = 0; i < 8; i++) {
                    frame[9 - i] = (byte) (len & 0xFF);
                    len >>= 8;
                }
                System.arraycopy(messageBytes, 0, frame, 10, messageBytes.length);
            }

            if (fast) {
                output.write(frame);
                output.flush();
            } else {
                synchronized (output) {
                    output.write(frame);
                    output.flush();
                }
            }

        } catch (IOException e) {
            disconnect();
        }
    }

    public void disconnect() {
        isWebSocketConnected = false;
        server.removeClient(this);
        try {
            if (socket != null) socket.close();
        } catch (IOException e) {
            // Ignorer
        }
    }

    public String getClientId() {
        return clientId;
    }

    public String getClientIP() {
        return clientIP;
    }

    public Socket getSocket() {
        return socket;
    }

    public boolean isConnected() {
        return isWebSocketConnected && socket != null && !socket.isClosed();
    }
}