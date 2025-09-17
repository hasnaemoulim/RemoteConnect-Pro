package main.java.server;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

public class ControlQueue {
    private BlockingQueue<String> waitingQueue = new LinkedBlockingQueue<>();
    private String currentController = null;
    private Map<String, Long> lastActivityTime = new ConcurrentHashMap<>();
    private Map<String, String> clientNames = new ConcurrentHashMap<>();
    private ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> currentTimeoutTask = null;

    // ✅ CONFIGURATION MODIFIÉE : Temps selon vos besoins
    private static final long CONTROL_TIMEOUT = 240000; // ✅ 4 minutes (240 secondes)
    private static final long INACTIVITY_TIMEOUT = 60000; // ✅ 1 minute (60 secondes)

    // ✅ STATISTIQUES de concurrence
    private volatile int totalRequests = 0;
    private volatile int currentWaitingClients = 0;
    private volatile long sessionStartTime = 0;

    // ✅ RÉFÉRENCE au serveur pour notifications
    private WebSocketServer server;

    public ControlQueue() {
        // Démarrer le vérificateur périodique d'activité
        startActivityChecker();
    }

    public void setServer(WebSocketServer server) {
        this.server = server;
    }

    // ✅ MÉTHODE PRINCIPALE : Demander le contrôle
    public synchronized boolean requestControl(String clientId) {
        totalRequests++;

        if (currentController == null) {
            // ✅ ACCORDER LE CONTRÔLE IMMÉDIATEMENT
            currentController = clientId;
            sessionStartTime = System.currentTimeMillis();
            updateLastActivity(clientId);
            startControlTimer();

            System.out.println("🎮 CONTRÔLE ACCORDÉ IMMÉDIATEMENT");
            System.out.println("   Client: " + clientId);
            System.out.println("   File d'attente: " + waitingQueue.size() + " clients");
            System.out.println("   Durée max: " + (CONTROL_TIMEOUT/1000) + " secondes");

            // Notifier le changement de contrôleur
            notifyControlChange(clientId, true);
            return true;

        } else if (currentController.equals(clientId)) {
            // ✅ RAFRAÎCHIR L'ACTIVITÉ du contrôleur actuel
            updateLastActivity(clientId);
            return true;

        } else {
            // ✅ AJOUTER À LA FILE D'ATTENTE
            if (!waitingQueue.contains(clientId)) {
                waitingQueue.offer(clientId);
                currentWaitingClients++;

                System.out.println("⏳ CLIENT MIS EN FILE D'ATTENTE");
                System.out.println("   Client: " + clientId);
                System.out.println("   Position: " + waitingQueue.size());
                System.out.println("   Contrôleur actuel: " + currentController);

                long remainingTime = CONTROL_TIMEOUT - (System.currentTimeMillis() - sessionStartTime);
                System.out.println("   Temps restant estimé: " + Math.max(0, remainingTime/1000) + "s");

                // Notifier la position dans la file
                notifyQueuePosition(clientId, waitingQueue.size());
            }
            return false;
        }
    }

    // ✅ MÉTHODE : Libérer le contrôle (SANS fermer la session)
    public synchronized void releaseControl(String clientId) {
        if (currentController != null && currentController.equals(clientId)) {
            cancelCurrentTimer();

            System.out.println("🔓 CONTRÔLE LIBÉRÉ VOLONTAIREMENT");
            System.out.println("   Ex-contrôleur: " + clientId);
            System.out.println("   Session reste ouverte");

            String previousController = currentController;
            currentController = null;
            sessionStartTime = 0;

            // Notifier la libération
            notifyControlChange(previousController, false);

            // Passer au suivant
            assignNextController();

        } else if (waitingQueue.contains(clientId)) {
            // ✅ RETIRER DE LA FILE D'ATTENTE
            waitingQueue.remove(clientId);
            currentWaitingClients--;
            System.out.println("❌ Client retiré de la file d'attente: " + clientId);

            // Mettre à jour les positions dans la file
            updateQueuePositions();
        }
    }

    // ✅ MÉTHODE : Vérifier si un client a le contrôle
    public synchronized boolean hasControl(String clientId) {
        if (currentController != null && currentController.equals(clientId)) {
            updateLastActivity(clientId);
            return true;
        }
        return false;
    }

    // ✅ MÉTHODE : Rafraîchir l'activité (pour éviter timeout d'inactivité)
    public synchronized void refreshActivity(String clientId) {
        if (currentController != null && currentController.equals(clientId)) {
            updateLastActivity(clientId);
        }
    }

    // ✅ MÉTHODE : Supprimer un client (déconnexion)
    public synchronized void removeClient(String clientId) {
        waitingQueue.remove(clientId);
        lastActivityTime.remove(clientId);
        clientNames.remove(clientId);

        if (currentController != null && currentController.equals(clientId)) {
            cancelCurrentTimer();

            System.out.println("🚪 DÉCONNEXION DU CONTRÔLEUR");
            System.out.println("   Client: " + clientId);
            System.out.println("   Rotation automatique vers le suivant");

            String disconnectedController = currentController;
            currentController = null;
            sessionStartTime = 0;

            // Notifier la déconnexion
            notifyControlChange(disconnectedController, false);

            // Passer au suivant
            assignNextController();
        }

        if (waitingQueue.contains(clientId)) {
            currentWaitingClients--;
            updateQueuePositions();
        }
    }

    // ✅ MÉTHODE : Forcer la libération (admin)
    public synchronized boolean forceRelease(String adminId) {
        if (currentController != null) {
            String forcedClient = currentController;

            System.out.println("🔨 LIBÉRATION FORCÉE PAR ADMIN");
            System.out.println("   Admin: " + adminId);
            System.out.println("   Client forcé: " + forcedClient);

            releaseControl(forcedClient);
            return true;
        }
        return false;
    }

    // ✅ MÉTHODES : Getters pour statistiques
    public synchronized String getCurrentController() {
        return currentController;
    }

    public synchronized int getWaitingQueueSize() {
        return waitingQueue.size();
    }

    public synchronized String[] getWaitingClients() {
        return waitingQueue.toArray(new String[0]);
    }

    public synchronized int getQueuePosition(String clientId) {
        if (currentController != null && currentController.equals(clientId)) {
            return 0; // Contrôle actuel
        }

        int position = 1;
        for (String client : waitingQueue) {
            if (client.equals(clientId)) {
                return position;
            }
            position++;
        }
        return -1; // Pas dans la file
    }

    public synchronized long getRemainingControlTime() {
        if (currentController != null && sessionStartTime > 0) {
            long elapsed = System.currentTimeMillis() - sessionStartTime;
            return Math.max(0, CONTROL_TIMEOUT - elapsed);
        }
        return 0;
    }

    // ✅ MÉTHODE : Afficher l'état de la concurrence
    public synchronized void printConcurrencyStatus() {
        System.out.println("\n📊 ÉTAT DE LA CONCURRENCE");
        System.out.println("══════════════════════════════");
        System.out.println("   Contrôleur actuel: " + (currentController != null ? currentController : "Aucun"));

        if (currentController != null) {
            long remainingTime = getRemainingControlTime();
            System.out.println("   Temps restant: " + (remainingTime/1000) + "s");
        }

        System.out.println("   Clients en attente: " + waitingQueue.size());
        System.out.println("   Total demandes: " + totalRequests);

        if (!waitingQueue.isEmpty()) {
            System.out.println("   File d'attente:");
            int position = 1;
            for (String clientId : waitingQueue) {
                String clientName = clientNames.getOrDefault(clientId, clientId);
                System.out.println("     " + position + ". " + clientName + " (" + clientId + ")");
                position++;
            }
        }
        System.out.println("══════════════════════════════\n");
    }

    // ✅ MÉTHODES PRIVÉES : Gestion interne

    private void updateLastActivity(String clientId) {
        lastActivityTime.put(clientId, System.currentTimeMillis());
    }

    private void assignNextController() {
        String nextClient = waitingQueue.poll();
        if (nextClient != null) {
            currentController = nextClient;
            currentWaitingClients--;
            sessionStartTime = System.currentTimeMillis();
            updateLastActivity(nextClient);
            startControlTimer();

            System.out.println("🔄 ROTATION DU CONTRÔLE (CONCURRENCE)");
            System.out.println("   Nouveau contrôleur: " + nextClient);
            System.out.println("   Clients restants en attente: " + waitingQueue.size());

            // Notifier le nouveau contrôleur
            notifyControlChange(nextClient, true);

            // Mettre à jour les positions
            updateQueuePositions();
        }
    }

    private void startControlTimer() {
        cancelCurrentTimer();

        currentTimeoutTask = scheduler.schedule(() -> {
            synchronized (this) {
                checkControlTimeout();
            }
        }, CONTROL_TIMEOUT, TimeUnit.MILLISECONDS);
    }

    private void cancelCurrentTimer() {
        if (currentTimeoutTask != null && !currentTimeoutTask.isDone()) {
            currentTimeoutTask.cancel(false);
            currentTimeoutTask = null;
        }
    }

    private void checkControlTimeout() {
        if (currentController != null) {
            long sessionDuration = System.currentTimeMillis() - sessionStartTime;

            if (sessionDuration >= CONTROL_TIMEOUT) {
                System.out.println("⏰ TIMEOUT AUTOMATIQUE (TEMPS MAX ATTEINT)");
                System.out.println("   Client timeout: " + currentController);
                System.out.println("   Durée: " + (sessionDuration/1000) + "s");
                System.out.println("   Rotation automatique vers le suivant");

                String timedOutClient = currentController;
                currentController = null;
                sessionStartTime = 0;

                // Notifier le timeout
                notifyControlChange(timedOutClient, false);

                // Passer au suivant
                assignNextController();
            }
        }
    }

    private void startActivityChecker() {
        scheduler.scheduleAtFixedRate(() -> {
            synchronized (this) {
                checkInactivityTimeout();
            }
        }, 10, 10, TimeUnit.SECONDS); // Vérifier toutes les 10 secondes
    }

    private void checkInactivityTimeout() {
        if (currentController != null) {
            Long lastActivity = lastActivityTime.get(currentController);
            if (lastActivity != null) {
                long inactivityDuration = System.currentTimeMillis() - lastActivity;

                if (inactivityDuration >= INACTIVITY_TIMEOUT) {
                    System.out.println("😴 TIMEOUT D'INACTIVITÉ");
                    System.out.println("   Client inactif: " + currentController);
                    System.out.println("   Inactivité: " + (inactivityDuration/1000) + "s");
                    System.out.println("   Rotation automatique vers le suivant");

                    String inactiveClient = currentController;
                    currentController = null;
                    sessionStartTime = 0;

                    // Notifier l'inactivité
                    notifyControlChange(inactiveClient, false);

                    // Passer au suivant
                    assignNextController();
                }
            }
        }
    }

    private void updateQueuePositions() {
        int position = 1;
        for (String clientId : waitingQueue) {
            notifyQueuePosition(clientId, position);
            position++;
        }
    }

    // ✅ MÉTHODES DE NOTIFICATION (à implémenter dans WebSocketServer)
    private void notifyControlChange(String clientId, boolean granted) {
        if (server != null) {
            server.notifyControlChange(clientId, granted);
        }
    }

    private void notifyQueuePosition(String clientId, int position) {
        if (server != null) {
            server.notifyQueuePosition(clientId, position);
        }
    }

    // ✅ MÉTHODE : Arrêt propre
    public void shutdown() {
        cancelCurrentTimer();
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }

        System.out.println("🛑 ControlQueue arrêté proprement");
    }

    // ✅ MÉTHODE : Enregistrer le nom d'un client
    public void setClientName(String clientId, String displayName) {
        clientNames.put(clientId, displayName);
    }
}