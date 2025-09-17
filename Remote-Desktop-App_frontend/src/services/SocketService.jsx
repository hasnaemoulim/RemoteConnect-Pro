class SocketService {
    constructor() {
        this.socket = null;
        this.eventHandlers = {};
        this.isConnected = false;
        this.isAuthenticated = false;
        this.connectionApproved = false;
        this.lastFrameId = -1;
        this.frameSkipCounter = 0;
        this.lastRenderTime = 0;
        this.MIN_RENDER_INTERVAL = 150;
        this.displayName = '';
        this.generatedPassword = null;
    }

    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    connect(serverAddress) {
        try {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            
            this.socket = new WebSocket(`ws://${serverAddress}:8081`);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                console.log('✅ WebSocket connecté sur port 8081');
                this.emit('connected');
            };

            this.socket.onmessage = (event) => {
                console.log('📨 Message WebSocket reçu:', event.data);
                this.handleMessage(event.data);
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.isAuthenticated = false;
                this.connectionApproved = false;
                this.generatedPassword = null;
                console.log('❌ WebSocket déconnecté');
                this.emit('disconnected');
            };

            this.socket.onerror = (error) => {
                console.error('💥 Erreur WebSocket:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('💥 Erreur de connexion:', error);
        }
    }

   handleMessage(data) {
    console.log('🔍 Traitement du message:', data);
    
    if (typeof data === 'string') {
        if (data.startsWith('CLIENT_ID:')) {
            const clientId = data.split(':')[1];
            console.log('🆔 Client ID reçu:', clientId);
            this.emit('clientId', clientId);
            
        } else if (data.startsWith('CONNECTION_REQUEST:')) {
            const requestId = data.split(':')[1];
            console.log('📋 Demande de connexion:', requestId);
            this.emit('connectionRequest', requestId);
            
        } else if (data === 'CONNECTION_ACCEPTED') {
            this.connectionApproved = true;
            console.log('✅ Connexion acceptée');
            this.emit('connectionApproved');
            
        } else if (data.startsWith('GENERATED_PASSWORD:')) {
            const password = data.substring('GENERATED_PASSWORD:'.length);
            this.generatedPassword = password;
            console.log('🔑 Mot de passe généré reçu:', password);
            this.emit('passwordGenerated', password);
            
        } else if (data === 'AUTHENTICATION_SUCCESS') {
            this.isAuthenticated = true;
            console.log('🔐 Authentifié avec succès');
            this.emit('authenticationSuccess');
            
        // ✅ NOUVEAU : Gestion de la liste des utilisateurs
        } else if (data.startsWith('USER_LIST:')) {
            const userListJson = data.substring('USER_LIST:'.length);
            console.log('👥 Liste utilisateurs reçue:', userListJson);
            try {
                const userList = JSON.parse(userListJson);
                console.log('👥 Liste utilisateurs parsée:', userList);
                this.emit('userList', userList);
            } catch (e) {
                console.error('❌ Erreur parsing liste utilisateurs:', e);
                console.error('❌ Données brutes:', userListJson);
            }
            
        // ✅ GESTION : Fermeture de session par le serveur
        } else if (data.startsWith('SESSION_CLOSED_BY_SERVER:')) {
            const reason = data.substring('SESSION_CLOSED_BY_SERVER:'.length);
            console.log('🔚 Session fermée par le serveur:', reason);
            this.emit('sessionClosedByServer', reason);
            
        // ✅ GESTION : Confirmation de fermeture de session
        } else if (data === 'SESSION_ENDED_CONFIRMATION') {
            console.log('✅ Confirmation de fermeture de session');
            
            // ✅ CORRECTION : Nettoyer immédiatement les données d'écran
            this.emit('sessionEndConfirmation');
            
            // Forcer la déconnexion après un délai
            setTimeout(() => {
                this.disconnect();
            }, 500);
            
        } else if (data.startsWith('CONTROL_RESPONSE:')) {
            const granted = data.split(':')[1] === 'true';
            console.log('🎮 Réponse contrôle:', granted);
            this.emit(granted ? 'controlGranted' : 'controlDenied');
            
        } else if (data.startsWith('SCREEN_DATA:')) {
            if (this.isAuthenticated) {
                this.handleScreenData(data);
            }
            
        } else if (data.startsWith('CHAT_MESSAGE:')) {
            console.log('💬 Message chat reçu (brut):', data);
            const messageJson = data.substring('CHAT_MESSAGE:'.length);
            console.log('💬 JSON extrait:', messageJson);
            try {
                const message = JSON.parse(messageJson);
                console.log('💬 Message chat parsé:', message);
                this.emit('chatMessage', message);
            } catch (e) {
                console.error('❌ Erreur parsing message chat:', e);
                console.error('❌ Données brutes:', messageJson);
            }
            
        } else if (data.startsWith('CHAT_HISTORY:')) {
            console.log('📜 Historique chat reçu (brut):', data);
            const historyJson = data.substring('CHAT_HISTORY:'.length);
            console.log('📜 JSON historique extrait:', historyJson);
            try {
                const history = JSON.parse(historyJson);
                console.log('📜 Historique chat parsé:', history);
                this.emit('chatHistory', history);
            } catch (e) {
                console.error('❌ Erreur parsing historique chat:', e);
                console.error('❌ Données brutes:', historyJson);
            }
            
        } else if (data.startsWith('FILE_LIST:')) {
            const fileListJson = data.substring('FILE_LIST:'.length);
            console.log('📁 Liste fichiers reçue:', fileListJson);
            this.emit('fileList', fileListJson);
            
        } else if (data.startsWith('UPLOAD_SESSION:')) {
            const sessionId = data.substring('UPLOAD_SESSION:'.length);
            console.log('📤 Session upload:', sessionId);
            this.emit('uploadSession', sessionId);
            
        } else if (data.startsWith('CHUNK_ACK:')) {
            const ackData = data.substring('CHUNK_ACK:'.length);
            this.emit('chunkAck', ackData);
            
        } else if (data.startsWith('DOWNLOAD_START:')) {
            const downloadData = data.substring('DOWNLOAD_START:'.length);
            this.emit('downloadStart', downloadData);
            
        } else if (data.startsWith('FILE_CHUNK:')) {
            const chunkData = data.substring('FILE_CHUNK:'.length);
            this.emit('fileChunk', chunkData);
        
        } else {
            console.log('❓ Message non reconnu:', data);
        }
    }
}

// ✅ NOUVELLE MÉTHODE : Demander la liste des utilisateurs
requestUserList() {
    if (this.isConnected && this.isAuthenticated) {
        console.log('👥 Demande de liste des utilisateurs...');
        this.socket.send('REQUEST_USER_LIST');
    }
}

// ✅ AMÉLIORATION : Méthode disconnect avec nettoyage d'écran
disconnect() {
    console.log('🔌 Début de la déconnexion...');
    
    // ✅ CORRECTION : Nettoyer l'état d'écran immédiatement
    this.emit('screenData', null);
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
    }
    this.socket = null;
    
    // Réinitialiser tous les états
    this.isConnected = false;
    this.isAuthenticated = false;
    this.connectionApproved = false;
    this.generatedPassword = null;
    this.lastFrameId = -1;
    this.frameSkipCounter = 0;
    this.lastRenderTime = 0;
    
    console.log('🔌 Déconnexion complète');
}

      handleScreenData(data) {
        try {
            const now = Date.now();
            
            if (now - this.lastRenderTime < this.MIN_RENDER_INTERVAL) {
                return;
            }

            const parts = data.split(':');
            if (parts.length >= 3) {
                const frameId = parseInt(parts[1]);
                const base64Data = parts.slice(2).join(':');
                
                this.frameSkipCounter++;
                if (this.frameSkipCounter % 2 !== 0) {
                    return;
                }
                
                if (frameId > this.lastFrameId) {
                    const imageUrl = `data:image/jpeg;base64,${base64Data}`;
                    
                    this.emit('screenData', {
                        frameId: frameId,
                        imageUrl: imageUrl,
                        timestamp: now
                    });
                    
                    this.lastFrameId = frameId;
                    this.lastRenderTime = now;
                }
            }
        } catch (error) {
            console.error('Erreur traitement screen data:', error);
        }
    }

    authenticate(password, displayName) {
        if (this.isConnected && this.connectionApproved) {
            console.log('🔐 Envoi authentification avec nom:', displayName);
            this.displayName = displayName;
            this.socket.send('AUTHENTICATE:' + password + ':' + displayName);
        }
    }

    getGeneratedPassword() {
        return this.generatedPassword;
    }

    requestControl() {
        if (this.isConnected && this.isAuthenticated) {
            console.log('🎮 Demande de contrôle...');
            this.socket.send('REQUEST_CONTROL');
        }
    }

    releaseControl() {
        if (this.isConnected && this.isAuthenticated) {
            console.log('🔓 Libération du contrôle...');
            this.socket.send('RELEASE_CONTROL');
        }
    }

    sendInputEvent(event) {
        if (this.isConnected && this.isAuthenticated) {
            const message = 'INPUT_EVENT:' + JSON.stringify(event);
            this.socket.send(message);
        }
    }

    sendChatMessage(message) {
        if (this.isConnected && this.isAuthenticated && message.trim()) {
            console.log('💬 Envoi message chat:', message.trim());
            this.socket.send('CHAT_MESSAGE:' + message.trim());
        } else {
            console.warn('⚠️ Impossible d\'envoyer le message chat:', {
                connected: this.isConnected,
                authenticated: this.isAuthenticated,
                message: message
            });
        }
    }

    // ✅ NOUVELLE MÉTHODE : Fermer la session
    endSession() {
        if (this.isConnected && this.isAuthenticated) {
            console.log('🔚 Envoi demande de fermeture de session...');
            this.socket.send('END_SESSION');
        }
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
        console.log(`📡 Gestionnaire ajouté pour l'événement: ${event}`);
    }

    emit(event, data) {
        console.log(`📤 Émission de l'événement: ${event}`, data);
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`❌ Erreur handler ${event}:`, error);
                }
            });
        } else {
            console.warn(`⚠️ Aucun gestionnaire pour l'événement: ${event}`);
        }
    }

    off(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
        }
    }

   
    getDisplayName() {
        return this.displayName;
    }
}

export default SocketService;
