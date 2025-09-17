package main.java.server;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import main.java.capture.ScreenCapturer;
import main.java.chat.ChatManager;
import main.java.filetransfer.FileTransferManager;
import main.java.filetransfer.FileInfo;
import main.java.filetransfer.FileTransferSession;

public class WebSocketServer {
    private static final int WEBSOCKET_PORT = 8081;
    private ServerSocket serverSocket;
    private volatile boolean isRunning = false;
    private List<WebSocketClientHandler> clients = new CopyOnWriteArrayList<>();
    private ControlQueue controlQueue;
    private ScreenCapturer screenCapturer;
    private ScheduledExecutorService screenCaptureExecutor;
    private ScheduledExecutorService heartbeatExecutor;
    private ExecutorService clientExecutor;
    private AuthenticationManager authManager;
    private Scanner consoleScanner;
    private ChatManager chatManager;
    private FileTransferManager fileTransferManager;

    // Map pour stocker les noms d'affichage
    private Map<String, String> clientDisplayNames = new ConcurrentHashMap<>();

    // Optimisations
    private AtomicLong frameCounter = new AtomicLong(0);
    private volatile byte[] lastScreenData = null;
    private final Object screenDataLock = new Object();
    private long lastBroadcastTime = 0;
    private static final long MIN_BROADCAST_INTERVAL = 100;

    public WebSocketServer() {
        this.controlQueue = new ControlQueue();
        this.controlQueue.setServer(this); // ✅ NOUVEAU : Référence pour notifications
        this.screenCapturer = new ScreenCapturer();
        this.screenCaptureExecutor = Executors.newSingleThreadScheduledExecutor();
        this.heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();
        this.clientExecutor = Executors.newCachedThreadPool();
        this.authManager = new AuthenticationManager();
        this.consoleScanner = new Scanner(System.in);
        this.chatManager = new ChatManager();
        this.fileTransferManager = new FileTransferManager();
    }

    public void start() throws IOException {
        serverSocket = new ServerSocket(WEBSOCKET_PORT);
        isRunning = true;

        printStartupInfo();
        startScreenCapture();
        startHeartbeatService();
        startConsoleHandler();

        System.out.println("🟢 Serveur WebSocket prêt sur le port " + WEBSOCKET_PORT);
        System.out.println("🌐 Frontend React : http://localhost:3000");
        System.out.println("💬 Chat en direct avec noms personnalisés activé");
        System.out.println("📁 Transfert de fichiers activé");
        System.out.println("👥 Liste d'utilisateurs en temps réel activée");
        System.out.println("🔑 Génération automatique de mots de passe activée");
        System.out.println("⏱️ Contrôle limité: 4 minutes | Inactivité: 1 minute\n");

        while (isRunning) {
            try {
                Socket clientSocket = serverSocket.accept();
                String clientIP = clientSocket.getInetAddress().getHostAddress();

                WebSocketClientHandler handler = new WebSocketClientHandler(clientSocket, this, clientIP);
                clients.add(handler);
                clientExecutor.submit(handler);

                System.out.println("🔗 Nouvelle connexion WebSocket de: " + clientIP);
            } catch (IOException e) {
                if (isRunning) {
                    System.err.println("❌ Erreur lors de l'acceptation du client: " + e.getMessage());
                }
            }
        }
    }

    // ✅ NOUVELLE MÉTHODE : Notifier changement de contrôle
    public void notifyControlChange(String clientId, boolean granted) {
        for (WebSocketClientHandler client : clients) {
            if (client.getClientId().equals(clientId)) {
                if (granted) {
                    client.sendMessage("CONTROL_GRANTED");
                    System.out.println("✅ Notification contrôle accordé envoyée à: " + clientId);
                } else {
                    client.sendMessage("CONTROL_RELEASED");
                    System.out.println("❌ Notification contrôle libéré envoyée à: " + clientId);
                }
                break;
            }
        }

        // Diffuser la liste des utilisateurs mise à jour
        broadcastUserList();
    }

    // ✅ NOUVELLE MÉTHODE : Notifier position dans la file
    public void notifyQueuePosition(String clientId, int position) {
        for (WebSocketClientHandler client : clients) {
            if (client.getClientId().equals(clientId)) {
                client.sendMessage("QUEUE_POSITION:" + position);
                System.out.println("📍 Position " + position + " envoyée à: " + clientId);
                break;
            }
        }
    }

    // ✅ NOUVELLE MÉTHODE : Diffuser la liste des utilisateurs connectés
    public void broadcastUserList() {
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();

        // Créer la liste JSON des utilisateurs
        StringBuilder userListJson = new StringBuilder("[");

        for (int i = 0; i < authenticatedClients.size(); i++) {
            WebSocketClientHandler client = authenticatedClients.get(i);
            String clientId = client.getClientId();
            String displayName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
            boolean hasControl = controlQueue.hasControl(clientId);
            String clientIP = client.getClientIP();

            userListJson.append("{")
                    .append("\"id\":\"").append(clientId).append("\",")
                    .append("\"displayName\":\"").append(displayName).append("\",")
                    .append("\"hasControl\":").append(hasControl).append(",")
                    .append("\"ip\":\"").append(clientIP).append("\",")
                    .append("\"status\":\"").append(hasControl ? "Contrôle" : "Spectateur").append("\"")
                    .append("}");

            if (i < authenticatedClients.size() - 1) {
                userListJson.append(",");
            }
        }

        userListJson.append("]");

        // Diffuser la liste à tous les clients authentifiés
        String message = "USER_LIST:" + userListJson.toString();
        authenticatedClients.parallelStream().forEach(client -> {
            try {
                client.sendMessage(message);
            } catch (Exception e) {
                // Ignorer silencieusement
            }
        });

        System.out.println("📋 Liste des utilisateurs diffusée: " + authenticatedClients.size() + " clients");
    }

    // ✅ NOUVELLE MÉTHODE : Envoyer la liste à un client spécifique
    public void sendUserListToClient(WebSocketClientHandler client) {
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();

        StringBuilder userListJson = new StringBuilder("[");

        for (int i = 0; i < authenticatedClients.size(); i++) {
            WebSocketClientHandler authClient = authenticatedClients.get(i);
            String clientId = authClient.getClientId();
            String displayName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
            boolean hasControl = controlQueue.hasControl(clientId);
            String clientIP = authClient.getClientIP();

            userListJson.append("{")
                    .append("\"id\":\"").append(clientId).append("\",")
                    .append("\"displayName\":\"").append(displayName).append("\",")
                    .append("\"hasControl\":").append(hasControl).append(",")
                    .append("\"ip\":\"").append(clientIP).append("\",")
                    .append("\"status\":\"").append(hasControl ? "Contrôle" : "Spectateur").append("\"")
                    .append("}");

            if (i < authenticatedClients.size() - 1) {
                userListJson.append(",");
            }
        }

        userListJson.append("]");

        try {
            client.sendMessage("USER_LIST:" + userListJson.toString());
        } catch (Exception e) {
            System.err.println("Erreur envoi liste utilisateurs: " + e.getMessage());
        }
    }

    // ✅ GETTER : Pour accéder à ControlQueue
    public ControlQueue getControlQueue() {
        return controlQueue;
    }

    // Méthodes pour la gestion des fichiers
    public String startFileUpload(String clientId, String fileName, long fileSize, String fileType) {
        String sessionId = fileTransferManager.startFileUpload(clientId, fileName, fileSize, fileType);
        if (sessionId != null) {
            String senderName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
            System.out.println("📁 " + senderName + " commence l'upload de: " + fileName);
        }
        return sessionId;
    }

    public boolean receiveFileChunk(String sessionId, int chunkIndex, byte[] data) {
        boolean success = fileTransferManager.receiveFileChunk(sessionId, chunkIndex, data);
        if (success) {
            FileTransferSession session = fileTransferManager.getSession(sessionId);
            if (session != null && session.isComplete()) {
                broadcastFileAvailable(session.getFileName());
            }
        }
        return success;
    }

    public void sendFileList(WebSocketClientHandler client) {
        List<FileInfo> files = fileTransferManager.getAvailableFiles();
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < files.size(); i++) {
            json.append(files.get(i).toJson());
            if (i < files.size() - 1) json.append(",");
        }
        json.append("]");

        try {
            client.sendMessage("FILE_LIST:" + json.toString());
        } catch (Exception e) {
            System.err.println("Erreur envoi liste fichiers: " + e.getMessage());
        }
    }

    public void startFileDownload(String clientId, String fileName, WebSocketClientHandler client) {
        FileTransferSession session = fileTransferManager.startFileDownload(clientId, fileName);
        if (session != null) {
            try {
                String sessionInfo = String.format(
                        "{\"sessionId\":\"%s\",\"fileName\":\"%s\",\"fileSize\":%d,\"totalChunks\":%d}",
                        session.getSessionId(), session.getFileName(),
                        session.getFileSize(), session.getTotalChunks()
                );
                client.sendMessage("DOWNLOAD_START:" + sessionInfo);
                String senderName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
                System.out.println("📥 " + senderName + " télécharge: " + fileName);
            } catch (Exception e) {
                System.err.println("Erreur démarrage download: " + e.getMessage());
            }
        }
    }

    public void sendFileChunk(String sessionId, int chunkIndex, WebSocketClientHandler client) {
        byte[] chunkData = fileTransferManager.readFileChunk(sessionId, chunkIndex);
        if (chunkData != null) {
            try {
                String base64Data = Base64.getEncoder().encodeToString(chunkData);
                String message = String.format("FILE_CHUNK:%s:%d:%s", sessionId, chunkIndex, base64Data);
                client.sendMessage(message);
            } catch (Exception e) {
                System.err.println("Erreur envoi chunk: " + e.getMessage());
            }
        }
    }

    private void broadcastFileAvailable(String fileName) {
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();
        String message = "FILE_AVAILABLE:" + fileName;

        authenticatedClients.parallelStream().forEach(client -> {
            try {
                client.sendMessage(message);
            } catch (Exception e) {
                // Ignorer silencieusement
            }
        });

        chatManager.addSystemMessage("📁 Nouveau fichier disponible: " + fileName);
        main.java.chat.ChatMessage chatMessage = new main.java.chat.ChatMessage(
                "system", "Système", "📁 Nouveau fichier disponible: " + fileName, "system"
        );
        chatManager.broadcastMessage(chatMessage, authenticatedClients);
    }

    // Méthodes pour le chat avec noms personnalisés
    public void handleChatMessage(String senderId, String message) {
        String senderName = clientDisplayNames.getOrDefault(senderId, "User-" + senderId.substring(0, 4));

        chatManager.addMessage(senderId, senderName, message);
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();
        main.java.chat.ChatMessage chatMessage = new main.java.chat.ChatMessage(senderId, senderName, message, "text");
        chatManager.broadcastMessage(chatMessage, authenticatedClients);
    }

    public void sendChatHistoryToClient(WebSocketClientHandler client) {
        chatManager.broadcastChatHistory(client);
    }

    // ✅ MODIFICATION : Notification d'arrivée avec diffusion de liste
    public void notifyUserJoined(String clientId, String displayName) {
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();
        chatManager.notifyUserJoined(displayName, authenticatedClients);

        // ✅ NOUVEAU : Diffuser la liste mise à jour
        broadcastUserList();
    }

    // ✅ MODIFICATION : Notification de départ avec diffusion de liste
    public void notifyUserLeft(String clientId) {
        String displayName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();
        chatManager.notifyUserLeft(displayName, authenticatedClients);
        clientDisplayNames.remove(clientId);

        // ✅ NOUVEAU : Diffuser la liste mise à jour
        broadcastUserList();
    }

    private void startScreenCapture() {
        System.out.println("📹 Capture optimisée démarrée...");

        screenCaptureExecutor.scheduleAtFixedRate(() -> {
            try {
                List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();

                if (!authenticatedClients.isEmpty()) {
                    long currentTime = System.currentTimeMillis();

                    if (currentTime - lastBroadcastTime < MIN_BROADCAST_INTERVAL) {
                        return;
                    }

                    synchronized (screenDataLock) {
                        byte[] screenData = screenCapturer.captureScreen();

                        if (screenData != null && !Arrays.equals(screenData, lastScreenData)) {
                            lastScreenData = screenData.clone();
                            long frameId = frameCounter.incrementAndGet();

                            broadcastScreenDataFast(screenData, frameId, authenticatedClients);
                            lastBroadcastTime = currentTime;
                        }
                    }
                }
            } catch (Exception e) {
                // Ignorer les erreurs
            }
        }, 0, MIN_BROADCAST_INTERVAL, TimeUnit.MILLISECONDS);
    }

    public void broadcastScreenDataFast(byte[] screenData, long frameId, List<WebSocketClientHandler> targetClients) {
        if (screenData == null || targetClients.isEmpty()) return;

        String base64Image = Base64.getEncoder().encodeToString(screenData);
        String message = "SCREEN_DATA:" + frameId + ":" + base64Image;

        targetClients.parallelStream().forEach(client -> {
            try {
                client.sendMessageFast(message);
            } catch (Exception e) {
                // Ignorer silencieusement
            }
        });
    }

    private void startHeartbeatService() {
        heartbeatExecutor.scheduleAtFixedRate(() -> {
            clients.removeIf(client -> !client.isConnected());
        }, 30, 30, TimeUnit.SECONDS);
    }

    private void startConsoleHandler() {
        Thread consoleThread = new Thread(() -> {
            while (isRunning) {
                try {
                    String command = consoleScanner.nextLine().trim();
                    handleConsoleCommand(command);
                } catch (Exception e) {
                    // Ignorer
                }
            }
        });
        consoleThread.setDaemon(true);
        consoleThread.start();
    }

    // ✅ CORRECTION : Fermeture de session améliorée
    public void endClientSession(String clientId, WebSocketClientHandler clientHandler) {
        AuthenticationManager.AuthenticatedClient client = authManager.getAuthenticatedClient(clientId);
        if (client != null) {
            String displayName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));

            // ✅ CORRECTION : Libérer le contrôle avant la fermeture
            if (controlQueue.hasControl(clientId)) {
                controlQueue.releaseControl(clientId);
                System.out.println("🎮 Contrôle libéré pour: " + displayName);
            }

            // Envoyer confirmation de fermeture au client
            try {
                clientHandler.sendMessage("SESSION_ENDED_CONFIRMATION");

                // Attendre que le message soit envoyé
                Thread.sleep(1000);

            } catch (Exception e) {
                System.err.println("Erreur envoi confirmation: " + e.getMessage());
            }

            // ✅ CORRECTION : Nettoyer d'abord, déconnecter ensuite
            authManager.removeClient(clientId);
            clientDisplayNames.remove(clientId);

            // Notifier les autres clients AVANT la déconnexion
            notifyUserLeft(clientId);

            // Déconnecter le client en dernier
            clientHandler.disconnect();

            System.out.println("🔚 Session fermée par le client: " + displayName + " (" + clientId + ")");
        }
    }

    private void handleConsoleCommand(String command) {
        String[] parts = command.split(" ");
        String cmd = parts[0].toLowerCase();

        switch (cmd) {
            case "list":
                authManager.listPendingConnections();
                break;
            case "accept":
                if (parts.length > 1) {
                    authManager.acceptConnection(parts[1]);
                }
                break;
            case "deny":
                if (parts.length > 1) {
                    authManager.denyConnection(parts[1]);
                }
                break;
            case "passwords":
                authManager.listActivePasswords();
                break;
            case "getpassword":
                if (parts.length > 1) {
                    String clientId = parts[1];
                    String password = authManager.getClientPassword(clientId);
                    if (password != null) {
                        System.out.println("🔑 Mot de passe pour " + clientId + ": " + password);
                    } else {
                        System.out.println("❌ Aucun mot de passe trouvé pour " + clientId);
                    }
                } else {
                    System.out.println("Usage: getpassword <clientId>");
                }
                break;
            case "regenerate":
                if (parts.length > 1) {
                    String clientId = parts[1];
                    String newPassword = authManager.regeneratePasswordForClient(clientId);
                    System.out.println("🔄 Nouveau mot de passe pour " + clientId + ": " + newPassword);
                } else {
                    System.out.println("Usage: regenerate <clientId>");
                }
                break;
            case "closesession":
                if (parts.length > 1) {
                    String clientId = parts[1];
                    WebSocketClientHandler targetClient = null;

                    for (WebSocketClientHandler client : clients) {
                        if (client.getClientId().equals(clientId)) {
                            targetClient = client;
                            break;
                        }
                    }

                    if (targetClient != null) {
                        boolean closed = authManager.closeClientSession(clientId, targetClient);
                        if (closed) {
                            System.out.println("✅ Session fermée pour le client: " + clientId);
                        } else {
                            System.out.println("❌ Impossible de fermer la session pour: " + clientId);
                        }
                    } else {
                        System.out.println("❌ Client non trouvé: " + clientId);
                    }
                } else {
                    System.out.println("Usage: closesession <clientId>");
                }
                break;
            // ✅ NOUVELLES COMMANDES : Gestion de la concurrence
            case "status":
                controlQueue.printConcurrencyStatus();
                break;
            case "forcerelease":
                String adminId = "admin";
                boolean released = controlQueue.forceRelease(adminId);
                if (released) {
                    System.out.println("✅ Contrôle libéré de force");
                } else {
                    System.out.println("❌ Aucun contrôleur actuel");
                }
                break;
            case "queue":
                String[] waiting = controlQueue.getWaitingClients();
                System.out.println("📋 File d'attente (" + waiting.length + " clients):");
                for (int i = 0; i < waiting.length; i++) {
                    String displayName = clientDisplayNames.getOrDefault(waiting[i], waiting[i]);
                    System.out.println("   " + (i+1) + ". " + displayName + " (" + waiting[i] + ")");
                }
                break;
            case "chat":
                if (parts.length > 1) {
                    String adminMessage = String.join(" ", Arrays.copyOfRange(parts, 1, parts.length));
                    chatManager.addSystemMessage("Admin: " + adminMessage);
                    List<WebSocketClientHandler> clients = getAuthenticatedClients();
                    main.java.chat.ChatMessage msg = new main.java.chat.ChatMessage("admin", "Admin", adminMessage, "system");
                    chatManager.broadcastMessage(msg, clients);
                }
                break;
            case "clearchat":
                chatManager.clearHistory();
                break;
            case "files":
                listAvailableFiles();
                break;
            case "clearfiles":
                fileTransferManager.clearAllFiles();
                System.out.println("🗑️ Tous les fichiers ont été supprimés");
                break;
            case "users":
                listConnectedUsers();
                break;
            case "refreshusers":
                broadcastUserList();
                System.out.println("🔄 Liste des utilisateurs diffusée manuellement");
                break;
            case "stop":
                stop();
                break;
            case "help":
                printHelp();
                break;
            default:
                printHelp();
        }
    }

    private void listAvailableFiles() {
        List<FileInfo> files = fileTransferManager.getAvailableFiles();
        System.out.println("\n📁 FICHIERS DISPONIBLES");
        System.out.println("═══════════════════════════");

        if (files.isEmpty()) {
            System.out.println("Aucun fichier disponible");
        } else {
            for (FileInfo file : files) {
                System.out.println("📄 " + file.getName());
                System.out.println("   Taille: " + formatFileSize(file.getSize()));
                System.out.println("   Type: " + file.getType());
                System.out.println();
            }
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024) + " KB";
        return (bytes / (1024 * 1024)) + " MB";
    }

    // ✅ AMÉLIORATION : Liste des utilisateurs avec plus de détails
    private void listConnectedUsers() {
        System.out.println("\n👥 UTILISATEURS CONNECTÉS");
        System.out.println("═══════════════════════════");

        List<WebSocketClientHandler> authenticatedClients = getAuthenticatedClients();
        if (authenticatedClients.isEmpty()) {
            System.out.println("Aucun utilisateur connecté");
        } else {
            for (WebSocketClientHandler client : authenticatedClients) {
                String clientId = client.getClientId();
                String displayName = clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
                String controlStatus = controlQueue.hasControl(clientId) ? "🎮 Contrôle" : "👀 Spectateur";
                String password = authManager.getClientPassword(clientId);

                System.out.println("🔗 " + displayName);
                System.out.println("   ID: " + clientId);
                System.out.println("   IP: " + client.getClientIP());
                System.out.println("   Rôle: " + controlStatus);
                System.out.println("   🔑 Mot de passe: " + (password != null ? password : "N/A"));

                if (controlQueue.hasControl(clientId)) {
                    long remainingTime = controlQueue.getRemainingControlTime();
                    System.out.println("   ⏱️ Temps restant: " + (remainingTime/1000) + "s");
                } else {
                    int position = controlQueue.getQueuePosition(clientId);
                    if (position > 0) {
                        System.out.println("   📍 Position file: " + position);
                    }
                }
                System.out.println();
            }

            // ✅ NOUVEAU : Afficher le total
            System.out.println("📊 Total: " + authenticatedClients.size() + " utilisateur(s) connecté(s)");
        }
    }

    private void printHelp() {
        System.out.println("\n📚 COMMANDES DISPONIBLES");
        System.out.println("═══════════════════════════");
        System.out.println("list              - Lister les demandes de connexion");
        System.out.println("accept <ID>       - Accepter une connexion");
        System.out.println("deny <ID>         - Refuser une connexion");
        System.out.println("passwords         - Lister tous les mots de passe actifs");
        System.out.println("getpassword <ID>  - Obtenir le mot de passe d'un client");
        System.out.println("regenerate <ID>   - Régénérer le mot de passe d'un client");
        System.out.println("closesession <ID> - Fermer la session d'un client spécifique");
        System.out.println("status            - Afficher l'état de la concurrence"); // ✅ NOUVEAU
        System.out.println("forcerelease      - Libérer le contrôle de force"); // ✅ NOUVEAU
        System.out.println("queue             - Voir la file d'attente"); // ✅ NOUVEAU
        System.out.println("chat <message>    - Envoyer un message admin");
        System.out.println("clearchat         - Effacer l'historique du chat");
        System.out.println("files             - Lister les fichiers disponibles");
        System.out.println("clearfiles        - Supprimer tous les fichiers");
        System.out.println("users             - Lister les utilisateurs connectés");
        System.out.println("refreshusers      - Diffuser manuellement la liste des utilisateurs");
        System.out.println("stop              - Arrêter le serveur");
        System.out.println("help              - Afficher cette aide");
        System.out.println("═══════════════════════════════════\n");
    }

    private void printStartupInfo() {
        System.out.println("╔══════════════════════════════════════════╗");
        System.out.println("║       🚀 SERVEUR PARTAGE D'ÉCRAN        ║");
        System.out.println("║    AVEC CHAT ET TRANSFERT FICHIERS      ║");
        System.out.println("╠══════════════════════════════════════════╣");
        System.out.println("║ WebSocket: 8081                         ║");
        System.out.println("║ Frontend React: Port 3000               ║");
        System.out.println("║ 🔑 Mots de passe: Générés automatiquement ║");
        System.out.println("║ Chat: Noms d'affichage personnalisés     ║");
        System.out.println("║ Fichiers: Upload/Download jusqu'à 50MB   ║");
        System.out.println("║ 👥 Liste utilisateurs: Temps réel       ║");
        System.out.println("║ ⏱️ Contrôle limité: 4 minutes           ║");
        System.out.println("║ 😴 Timeout inactivité: 1 minute         ║");
        System.out.println("║ Optimisé: 8-10 FPS pour fluidité        ║");
        System.out.println("║                                          ║");
        System.out.println("║ 💬 COMMANDES PRINCIPALES:               ║");
        System.out.println("║ • list - Voir demandes de connexion     ║");
        System.out.println("║ • accept <ID> - Accepter une connexion  ║");
        System.out.println("║ • status - État de la concurrence       ║");
        System.out.println("║ • users - Voir utilisateurs connectés   ║");
        System.out.println("║ • help - Aide complète                  ║");
        System.out.println("╚══════════════════════════════════════════╝");
    }

    private List<WebSocketClientHandler> getAuthenticatedClients() {
        return clients.stream()
                .filter(client -> authManager.isAuthenticated(client.getClientId()))
                .collect(Collectors.toList());
    }

    public String requestConnection(String clientIP, WebSocketClientHandler handler) {
        return authManager.createConnectionRequest(clientIP, handler);
    }

    public boolean authenticatePassword(String clientId, String password) {
        return authManager.authenticatePassword(clientId, password);
    }

    // ✅ MODIFICATION : Authentification avec diffusion de liste
    public void authenticateClient(String clientId, String clientIP, String displayName) {
        authManager.addAuthenticatedClient(clientId, clientIP);
        clientDisplayNames.put(clientId, displayName);

        // ✅ NOUVEAU : Enregistrer le nom dans ControlQueue
        controlQueue.setClientName(clientId, displayName);

        for (WebSocketClientHandler client : clients) {
            if (client.getClientId().equals(clientId)) {
                sendChatHistoryToClient(client);
                sendUserListToClient(client);
                break;
            }
        }

        notifyUserJoined(clientId, displayName);
    }

    public void authenticateClient(String clientId, String clientIP) {
        authenticateClient(clientId, clientIP, "User-" + clientId.substring(0, 4));
    }

    // ✅ MODIFICATION : Contrôle avec diffusion de liste
    public boolean requestControl(String clientId) {
        boolean granted = controlQueue.requestControl(clientId);

        // ✅ NOUVEAU : Diffuser la liste mise à jour quand le contrôle change
        if (granted) {
            broadcastUserList();
        }

        return granted;
    }

    // ✅ MODIFICATION : Libération de contrôle avec diffusion de liste
    public void releaseControl(String clientId) {
        controlQueue.releaseControl(clientId);

        // ✅ NOUVEAU : Diffuser la liste mise à jour
        broadcastUserList();
    }

    public boolean hasControl(String clientId) {
        return controlQueue.hasControl(clientId);
    }

    // ✅ MODIFICATION : Suppression de client avec diffusion de liste
    public void removeClient(WebSocketClientHandler client) {
        String clientId = client.getClientId();

        // ✅ CORRECTION : Vérifier si le client existe avant suppression
        if (clients.contains(client)) {
            clients.remove(client);

            // Libérer le contrôle si nécessaire
            if (controlQueue.hasControl(clientId)) {
                controlQueue.releaseControl(clientId);
            }

            // Nettoyer l'authentification
            if (authManager.isAuthenticated(clientId)) {
                authManager.removeClient(clientId);
                // Notifier le départ et diffuser la liste mise à jour
                notifyUserLeft(clientId);
            }

            controlQueue.removeClient(clientId);

            System.out.println("🔌 Client supprimé: " + clientId);
        }
    }

    public String getClientDisplayName(String clientId) {
        return clientDisplayNames.getOrDefault(clientId, "User-" + clientId.substring(0, 4));
    }

    public void updateClientDisplayName(String clientId, String newDisplayName) {
        if (clientDisplayNames.containsKey(clientId)) {
            String oldName = clientDisplayNames.get(clientId);
            clientDisplayNames.put(clientId, newDisplayName);

            chatManager.addSystemMessage(oldName + " a changé son nom en " + newDisplayName);
            List<WebSocketClientHandler> clients = getAuthenticatedClients();
            main.java.chat.ChatMessage msg = new main.java.chat.ChatMessage("system", "Système",
                    oldName + " a changé son nom en " + newDisplayName, "system");
            chatManager.broadcastMessage(msg, clients);

            // ✅ NOUVEAU : Diffuser la liste mise à jour après changement de nom
            broadcastUserList();
        }
    }

    public void stop() {
        isRunning = false;

        screenCaptureExecutor.shutdown();
        heartbeatExecutor.shutdown();
        clientExecutor.shutdown();
        controlQueue.shutdown();

        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException e) {
            // Ignorer
        }

        System.exit(0);
    }

    public static void main(String[] args) {
        try {
            new WebSocketServer().start();
        } catch (IOException e) {
            System.err.println("Erreur serveur: " + e.getMessage());
        }
    }
}