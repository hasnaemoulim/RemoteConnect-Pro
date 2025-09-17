import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RemoteDesktopApp from './components/RemoteDesktopApp';
import SocketService from './services/SocketService';

const AppRouter = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionData, setSessionData] = useState(null);
    const [isEnding, setIsEnding] = useState(false);

    // Vérifier s'il y a une session active au chargement
    useEffect(() => {
        const savedSession = localStorage.getItem('remoteSession');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                setSessionData(session);
                setIsAuthenticated(true);
            } catch (error) {
                localStorage.removeItem('remoteSession');
            }
        }
    }, []);

    // Écouter la fermeture de session par le serveur
    useEffect(() => {
        const socketService = SocketService.getInstance();
        
        const handleSessionClosedByServer = (reason) => {
            console.log('🔚 Session fermée par le serveur:', reason);
            handleEndSession(false); // false = pas initié par le client
        };
        
        const handleSessionEndConfirmation = () => {
            console.log('✅ Confirmation de fermeture de session reçue');
            setIsEnding(false);
        };
        
        socketService.on('sessionClosedByServer', handleSessionClosedByServer);
        socketService.on('sessionEndConfirmation', handleSessionEndConfirmation);
        
        return () => {
            socketService.off('sessionClosedByServer', handleSessionClosedByServer);
            socketService.off('sessionEndConfirmation', handleSessionEndConfirmation);
        };
    }, []);

    // Fonction pour démarrer une session
    const handleStartSession = (serverAddress, displayName) => {
        const session = {
            serverAddress,
            displayName,
            startTime: Date.now(),
            sessionId: Date.now().toString()
        };
        
        setSessionData(session);
        setIsAuthenticated(true);
        localStorage.setItem('remoteSession', JSON.stringify(session));
    };

    // Fonction pour terminer une session
    const handleEndSession = (clientInitiated = true) => {
        setIsEnding(true);
        
        // Si c'est le client qui ferme, envoyer la demande au serveur
        if (clientInitiated) {
            const socketService = SocketService.getInstance();
            if (socketService.isConnected) {
                socketService.endSession();
            }
        }
        
        // Attendre un peu pour que le message soit envoyé
        setTimeout(() => {
            // Déconnecter le WebSocket
            SocketService.getInstance().disconnect();
            
            // Nettoyer les données
            setIsAuthenticated(false);
            setSessionData(null);
            setIsEnding(false);
            localStorage.removeItem('remoteSession');
            
            console.log('🔚 Session terminée');
        }, clientInitiated ? 1500 : 0);
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route 
                    path="/" 
                    element={
                        !isAuthenticated ? (
                            <LandingPage onStartSession={handleStartSession} />
                        ) : (
                            <Navigate to="/session" replace />
                        )
                    } 
                />
                <Route 
                    path="/session" 
                    element={
                        isAuthenticated ? (
                            <RemoteDesktopApp 
                                sessionData={sessionData}
                                onEndSession={handleEndSession}
                                isEnding={isEnding}
                            />
                        ) : (
                            <Navigate to="/" replace />
                        )
                    } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
