package main.java.server;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.security.SecureRandom;

public class AuthenticationManager {
    private Map<String, PendingConnection> pendingConnections = new ConcurrentHashMap<>();
    private Map<String, AuthenticatedClient> authenticatedClients = new ConcurrentHashMap<>();
    private Map<String, String> clientPasswords = new ConcurrentHashMap<>();
    private SecureRandom secureRandom = new SecureRandom();

    // Caractères pour la génération de mots de passe
    private static final String UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    private static final String DIGITS = "0123456789";
    private static final String SPECIAL_CHARS = "!@#$%^&*";
    private static final String ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL_CHARS;

    public static class PendingConnection {
        public String requestId;
        public String clientIP;
        public LocalDateTime requestTime;
        public WebSocketClientHandler handler;
        public String generatedPassword;

        public PendingConnection(String requestId, String clientIP, WebSocketClientHandler handler, String password) {
            this.requestId = requestId;
            this.clientIP = clientIP;
            this.requestTime = LocalDateTime.now();
            this.handler = handler;
            this.generatedPassword = password;
        }
    }

    public static class AuthenticatedClient {
        public String clientId;
        public String clientIP;
        public LocalDateTime connectedTime;
        public String usedPassword;
        public String displayName; // Ajout du champ manquant

        public AuthenticatedClient(String clientId, String clientIP, String password) {
            this.clientId = clientId;
            this.clientIP = clientIP;
            this.connectedTime = LocalDateTime.now();
            this.usedPassword = password;
            this.displayName = "User-" + clientId.substring(0, 4);
        }

        public AuthenticatedClient(String clientId, String clientIP, String password, String displayName) {
            this.clientId = clientId;
            this.clientIP = clientIP;
            this.connectedTime = LocalDateTime.now();
            this.usedPassword = password;
            this.displayName = displayName;
        }
    }

    /**
     * Génère un mot de passe sécurisé et unique
     */
    private String generateSecurePassword() {
        int length = 8;
        StringBuilder password = new StringBuilder();

        password.append(UPPERCASE.charAt(secureRandom.nextInt(UPPERCASE.length())));
        password.append(LOWERCASE.charAt(secureRandom.nextInt(LOWERCASE.length())));
        password.append(DIGITS.charAt(secureRandom.nextInt(DIGITS.length())));
        password.append(SPECIAL_CHARS.charAt(secureRandom.nextInt(SPECIAL_CHARS.length())));

        for (int i = 4; i < length; i++) {
            password.append(ALL_CHARS.charAt(secureRandom.nextInt(ALL_CHARS.length())));
        }

        return shuffleString(password.toString());
    }

    /**
     * Génère un mot de passe basé sur l'IP et l'heure
     */
    private String generatePasswordFromContext(String clientIP) {
        String[] ipParts = clientIP.split("\\.");
        String lastOctet = ipParts[ipParts.length - 1];
        String timeStamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HHmmss"));
        String base = "RC" + lastOctet + timeStamp;
        String randomSuffix = generateRandomString(2);
        return base + randomSuffix;
    }

    /**
     * Génère un mot de passe numérique simple (6 chiffres)
     */
    private String generateNumericPassword() {
        return String.format("%06d", secureRandom.nextInt(1000000));
    }

    /**
     * Génère un mot de passe alphanumérique simple (8 caractères)
     */
    private String generateSimplePassword() {
        String simpleChars = UPPERCASE + LOWERCASE + DIGITS;
        StringBuilder password = new StringBuilder();

        for (int i = 0; i < 8; i++) {
            password.append(simpleChars.charAt(secureRandom.nextInt(simpleChars.length())));
        }

        return password.toString();
    }

    /**
     * Mélange une chaîne de caractères
     */
    private String shuffleString(String input) {
        char[] chars = input.toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = secureRandom.nextInt(i + 1);
            char temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        return new String(chars);
    }

    /**
     * Génère une chaîne aléatoire de longueur donnée
     */
    private String generateRandomString(int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(ALL_CHARS.charAt(secureRandom.nextInt(ALL_CHARS.length())));
        }
        return sb.toString();
    }

    public String createConnectionRequest(String clientIP, WebSocketClientHandler handler) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String generatedPassword = generateSimplePassword();

        PendingConnection pending = new PendingConnection(requestId, clientIP, handler, generatedPassword);
        pendingConnections.put(requestId, pending);
        clientPasswords.put(handler.getClientId(), generatedPassword);

        System.out.println("🔔 DEMANDE DE CONNEXION");
        System.out.println("   ID: " + requestId);
        System.out.println("   IP: " + clientIP);
        System.out.println("   Heure: " + pending.requestTime);
        System.out.println("   🔑 MOT DE PASSE GÉNÉRÉ: " + generatedPassword);
        System.out.println("   Tapez 'accept " + requestId + "' pour accepter");
        System.out.println("   Tapez 'deny " + requestId + "' pour refuser");
        System.out.println("   ⚠️  Communiquez ce mot de passe au client : " + generatedPassword);

        return requestId;
    }

    public boolean acceptConnection(String requestId) {
        PendingConnection pending = pendingConnections.remove(requestId);
        if (pending != null) {
            pending.handler.sendMessage("CONNECTION_ACCEPTED");
            pending.handler.sendMessage("GENERATED_PASSWORD:" + pending.generatedPassword);

            System.out.println("✅ Connexion acceptée pour " + pending.clientIP);
            System.out.println("🔑 Mot de passe envoyé au client: " + pending.generatedPassword);
            return true;
        }
        return false;
    }

    public boolean denyConnection(String requestId) {
        PendingConnection pending = pendingConnections.remove(requestId);
        if (pending != null) {
            clientPasswords.remove(pending.handler.getClientId());
            pending.handler.sendMessage("CONNECTION_DENIED:Connexion refusée par l'hôte");
            pending.handler.disconnect();
            System.out.println("❌ Connexion refusée pour " + pending.clientIP);
            return true;
        }
        return false;
    }

    public boolean authenticatePassword(String clientId, String password) {
        String expectedPassword = clientPasswords.get(clientId);

        if (expectedPassword != null && expectedPassword.equals(password)) {
            System.out.println("✅ Authentification réussie pour le client " + clientId + " avec le mot de passe: " + password);
            return true;
        }

        System.out.println("❌ Authentification échouée pour le client " + clientId + ". Mot de passe attendu: " + expectedPassword + ", reçu: " + password);
        return false;
    }

    public void addAuthenticatedClient(String clientId, String clientIP) {
        String usedPassword = clientPasswords.get(clientId);
        authenticatedClients.put(clientId, new AuthenticatedClient(clientId, clientIP, usedPassword));
        System.out.println("🔐 Client authentifié: " + clientId + " (" + clientIP + ") avec mot de passe: " + usedPassword);
    }

    public void addAuthenticatedClient(String clientId, String clientIP, String displayName) {
        String usedPassword = clientPasswords.get(clientId);
        authenticatedClients.put(clientId, new AuthenticatedClient(clientId, clientIP, usedPassword, displayName));
        System.out.println("🔐 Client authentifié: " + displayName + " (" + clientId + " - " + clientIP + ") avec mot de passe: " + usedPassword);
    }

    public boolean isAuthenticated(String clientId) {
        return authenticatedClients.containsKey(clientId);
    }

    public void removeClient(String clientId) {
        authenticatedClients.remove(clientId);
        clientPasswords.remove(clientId);

        pendingConnections.entrySet().removeIf(entry ->
                entry.getValue().handler.getClientId().equals(clientId));
    }

    public void listPendingConnections() {
        if (pendingConnections.isEmpty()) {
            System.out.println("Aucune demande de connexion en attente");
        } else {
            System.out.println("📋 Demandes de connexion en attente:");
            pendingConnections.forEach((id, pending) -> {
                System.out.println("   " + id + " - " + pending.clientIP + " (" + pending.requestTime + ")");
                System.out.println("      🔑 Mot de passe: " + pending.generatedPassword);
            });
        }
    }

    public String getClientPassword(String clientId) {
        return clientPasswords.get(clientId);
    }

    public String regeneratePasswordForClient(String clientId) {
        String newPassword = generateSimplePassword();
        clientPasswords.put(clientId, newPassword);
        System.out.println("🔄 Nouveau mot de passe généré pour " + clientId + ": " + newPassword);
        return newPassword;
    }

    public void listActivePasswords() {
        System.out.println("\n🔑 MOTS DE PASSE ACTIFS");
        System.out.println("═══════════════════════════");

        if (clientPasswords.isEmpty()) {
            System.out.println("Aucun mot de passe actif");
        } else {
            clientPasswords.forEach((clientId, password) -> {
                AuthenticatedClient client = authenticatedClients.get(clientId);
                String status = client != null ? "✅ Authentifié" : "⏳ En attente";
                String displayName = client != null ? client.displayName : "N/A";
                System.out.println("Client: " + displayName + " (" + clientId.substring(0, 8) + "...) - Mot de passe: " + password + " - " + status);
            });
        }
        System.out.println();
    }

    public boolean closeClientSession(String clientId, WebSocketClientHandler serverHandler) {
        AuthenticatedClient client = authenticatedClients.get(clientId);
        if (client != null) {
            if (serverHandler != null) {
                serverHandler.sendMessage("SESSION_CLOSED_BY_SERVER:Votre session a été fermée par l'administrateur");

                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }

                serverHandler.disconnect();
            }

            removeClient(clientId);
            System.out.println("🔚 Session fermée par l'administrateur pour: " + client.displayName + " (" + clientId + ")");
            return true;
        }
        return false;
    }

    public void closeAllSessions() {
        System.out.println("🔚 Fermeture de toutes les sessions actives...");

        for (AuthenticatedClient client : authenticatedClients.values()) {
            System.out.println("   Fermeture session: " + client.displayName + " (" + client.clientId + ")");
        }

        authenticatedClients.clear();
        clientPasswords.clear();
        pendingConnections.clear();

        System.out.println("✅ Toutes les sessions ont été fermées");
    }

    public AuthenticatedClient getAuthenticatedClient(String clientId) {
        return authenticatedClients.get(clientId);
    }
}