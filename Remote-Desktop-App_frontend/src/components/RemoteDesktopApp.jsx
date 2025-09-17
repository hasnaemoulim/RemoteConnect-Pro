import React, { useState, useEffect } from 'react';
import { 
    ThemeProvider, 
    createTheme, 
    CssBaseline, 
    Box, 
    Container,
    AppBar,
    Toolbar,
    Typography,
    Chip,
    Grid,
    Paper,
    Fade,
    Slide,
    Alert,
    Snackbar,
    Stack,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress
} from '@mui/material';
import {
    Computer,
    Wifi,
    WifiOff,
    Security,
    SportsEsports,
    Visibility,
    Speed,
    SignalWifi4Bar,
    Lock,
    ExitToApp,
    PowerSettingsNew
} from '@mui/icons-material';
import ConnectionManager from './ConnectionManager';
import ScreenViewer from './ScreenViewer';
import ControlPanel from './ControlPanel';
import QueueStatus from './QueueStatus';
import AuthenticationDialog from './AuthenticationDialog';
import ChatComponent from './ChatComponent';
import FileTransferComponent from './FileTransferComponent';
import SocketService from '../services/SocketService';

const theme = createTheme({
    // Votre thème existant...
    palette: {
        primary: {
            main: '#22c55e',
            light: '#4ade80',
            dark: '#16a34a',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
            contrastText: '#ffffff'
        },
        // ... reste du thème
    }
});

function RemoteDesktopApp({ sessionData, onEndSession, isEnding }) {
    // Vos états existants...
    const [isConnected, setIsConnected] = useState(false);
    const [connectionApproved, setConnectionApproved] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasControl, setHasControl] = useState(false);
    const [screenData, setScreenData] = useState(false);
    const [clientId, setClientId] = useState('');
    const [connectionState, setConnectionState] = useState('CLOSED');
    
    // États d'interface
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [queuePosition, setQueuePosition] = useState(-1);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    
    // États de performance
    const [fps, setFps] = useState(0);
    const [latency, setLatency] = useState(0);
    const [quality, setQuality] = useState('HD');
    
    // NOUVEAU : États pour la fermeture de session
    const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

    // Connexion automatique avec les données de session
    useEffect(() => {
        if (sessionData && !isConnected) {
            handleConnect(sessionData.serverAddress);
        }
    }, [sessionData]);

    // Vos useEffect existants pour les gestionnaires WebSocket...
    useEffect(() => {
        const socketService = SocketService.getInstance();
        
        const handleConnected = () => {
            setIsConnected(true);
            setConnectionState('CONNECTED');
            showNotification('Connexion établie avec succès', 'success');
        };

        const handleClientId = (id) => {
            setClientId(id);
        };

        const handleConnectionRequest = (requestId) => {
            setConnectionState('WAITING_APPROVAL');
            showNotification('Demande de connexion envoyée, en attente d\'approbation...', 'info');
        };

        const handleConnectionApproved = () => {
            setConnectionApproved(true);
            setConnectionState('APPROVED');
            setShowAuthDialog(true);
            showNotification('Connexion approuvée ! Authentification requise', 'success');
        };

        const handleConnectionDenied = (reason) => {
            setConnectionState('DENIED');
            showNotification(`Connexion refusée: ${reason || 'Raison non spécifiée'}`, 'error');
            socketService.disconnect();
        };

        const handleAuthenticationSuccess = () => {
            setIsAuthenticated(true);
            setShowAuthDialog(false);
            setAuthError('');
            setIsAuthenticating(false);
            setConnectionState('AUTHENTICATED');
            showNotification('Authentification réussie ! Réception du flux vidéo...', 'success');
        };

        const handleAuthenticationFailed = () => {
            setAuthError('Mot de passe incorrect. Veuillez réessayer.');
            setIsAuthenticating(false);
            showNotification('Échec de l\'authentification', 'error');
        };

        const handleDisconnected = () => {
            setIsConnected(false);
            setConnectionApproved(false);
            setIsAuthenticated(false);
            setHasControl(false);
            setScreenData(null);
            setShowAuthDialog(false);
            setConnectionState('CLOSED');
            setQueuePosition(-1);
            showNotification('Connexion fermée', 'warning');
        };

        const handleScreenData = (data) => {
            if (typeof data === 'object' && data.imageUrl) {
                setScreenData(data);
                setFps(prev => Math.min(prev + 1, 60));
                setLatency(Math.floor(Math.random() * 30) + 10);
            } else if (typeof data === 'string') {
                setScreenData({ 
                    imageUrl: data, 
                    frameId: Date.now(),
                    timestamp: Date.now()
                });
            }
        };

        const handleControlGranted = () => {
            setHasControl(true);
            setQueuePosition(-1);
            showNotification('Contrôle accordé ! Vous pouvez maintenant interagir avec l\'écran', 'success');
        };

        const handleControlDenied = () => {
            setHasControl(false);
            showNotification('Demande de contrôle refusée ou en file d\'attente', 'warning');
        };

        const handleControlReleased = () => {
            setHasControl(false);
            showNotification('Contrôle libéré', 'info');
        };

        const handleQueueUpdate = (position) => {
            setQueuePosition(position);
            if (position > 0) {
                showNotification(`Vous êtes en position ${position} dans la file d'attente`, 'info');
            }
        };

        // NOUVEAU : Gestionnaire pour fermeture par le serveur
        const handleSessionClosedByServer = (reason) => {
            showNotification(`Session fermée par l'administrateur: ${reason}`, 'error');
            setTimeout(() => {
                onEndSession(false);
            }, 2000);
        };

        // Enregistrer tous les gestionnaires
        socketService.on('connected', handleConnected);
        socketService.on('clientId', handleClientId);
        socketService.on('connectionRequest', handleConnectionRequest);
        socketService.on('connectionApproved', handleConnectionApproved);
        socketService.on('connectionDenied', handleConnectionDenied);
        socketService.on('authenticationSuccess', handleAuthenticationSuccess);
        socketService.on('authenticationFailed', handleAuthenticationFailed);
        socketService.on('disconnected', handleDisconnected);
        socketService.on('screenData', handleScreenData);
        socketService.on('controlGranted', handleControlGranted);
        socketService.on('controlDenied', handleControlDenied);
        socketService.on('controlReleased', handleControlReleased);
        socketService.on('queueUpdate', handleQueueUpdate);
        socketService.on('sessionClosedByServer', handleSessionClosedByServer);

        return () => {
            socketService.off('connected', handleConnected);
            socketService.off('clientId', handleClientId);
            socketService.off('connectionRequest', handleConnectionRequest);
            socketService.off('connectionApproved', handleConnectionApproved);
            socketService.off('connectionDenied', handleConnectionDenied);
            socketService.off('authenticationSuccess', handleAuthenticationSuccess);
            socketService.off('authenticationFailed', handleAuthenticationFailed);
            socketService.off('disconnected', handleDisconnected);
            socketService.off('screenData', handleScreenData);
            socketService.off('controlGranted', handleControlGranted);
            socketService.off('controlDenied', handleControlDenied);
            socketService.off('controlReleased', handleControlReleased);
            socketService.off('queueUpdate', handleQueueUpdate);
            socketService.off('sessionClosedByServer', handleSessionClosedByServer);
        };
    }, [onEndSession]);

    // Réinitialiser FPS périodiquement
    useEffect(() => {
        const interval = setInterval(() => {
            setFps(0);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Vos fonctions existantes...
    const handleConnect = (serverAddress) => {
        setConnectionState('CONNECTING');
        showNotification('Connexion en cours...', 'info');
        SocketService.getInstance().connect(serverAddress);
    };

    const handleAuthenticate = (password, displayName) => {
        setIsAuthenticating(true);
        setAuthError('');
        SocketService.getInstance().authenticate(password, displayName || sessionData?.displayName);
    };

    const handleCancelAuth = () => {
        setShowAuthDialog(false);
        SocketService.getInstance().disconnect();
        showNotification('Authentification annulée', 'info');
        onEndSession(false);
    };

    const handleRequestControl = () => {
        SocketService.getInstance().requestControl();
        showNotification('Demande de contrôle envoyée...', 'info');
    };

    const handleReleaseControl = () => {
        SocketService.getInstance().releaseControl();
        setHasControl(false);
        showNotification('Contrôle libéré', 'info');
    };

    // NOUVEAU : Fonctions pour la fermeture de session
    const handleEndSessionClick = () => {
        setShowEndSessionDialog(true);
    };

    const handleConfirmEndSession = () => {
        setShowEndSessionDialog(false);
        onEndSession(true);
    };

    const handleCancelEndSession = () => {
        setShowEndSessionDialog(false);
    };

    const showNotification = (message, severity = 'info') => {
        setNotification({ open: true, message, severity });
    };

    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    const getConnectionStatus = () => {
        switch (connectionState) {
            case 'CONNECTING': return { text: 'Connexion...', color: 'warning', icon: <Wifi /> };
            case 'CONNECTED': return { text: 'Connecté', color: 'success', icon: <Wifi /> };
            case 'WAITING_APPROVAL': return { text: 'En attente d\'approbation', color: 'info', icon: <Security /> };
            case 'APPROVED': return { text: 'Approuvé', color: 'success', icon: <Security /> };
            case 'AUTHENTICATED': return { text: 'Authentifié', color: 'success', icon: <Security /> };
            case 'DENIED': return { text: 'Refusé', color: 'error', icon: <WifiOff /> };
            default: return { text: 'Déconnecté', color: 'default', icon: <WifiOff /> };
        }
    };

    const status = getConnectionStatus();

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #15803d 0%, #065f46 100%)',
                    position: 'relative'
                }}
            >
                <AppBar 
                    position="sticky" 
                    elevation={0}
                    sx={{ 
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                >
                    <Toolbar sx={{ py: 1 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Computer sx={{ color: 'white', fontSize: 28 }} />
                            <Box>
                                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}>
                                    RemoteConnect Pro
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                    Session: {sessionData?.displayName}
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                                icon={status.icon}
                                label={status.text}
                                color={status.color}
                                variant="filled"
                                size="small"
                                sx={{ 
                                    color: 'white',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': { color: 'white' }
                                }}
                            />
                            
                            {clientId && (
                                <Chip
                                    label={`ID: ${clientId}`}
                                    variant="outlined"
                                    size="small"
                                    sx={{ 
                                        color: 'white',
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem'
                                    }}
                                />
                            )}
                            
                            {isAuthenticated && (
                                <Chip
                                    icon={hasControl ? <SportsEsports /> : <Visibility />}
                                    label={hasControl ? 'Contrôle actif' : 'Mode spectateur'}
                                    color={hasControl ? 'success' : 'default'}
                                    size="small"
                                    sx={{ 
                                        color: 'white',
                                        fontWeight: 600,
                                        '& .MuiChip-icon': { color: 'white' }
                                    }}
                                />
                            )}

                            {/* NOUVEAU : Bouton de fermeture de session */}
                            {isAuthenticated && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={isEnding ? <CircularProgress size={16} color="inherit" /> : <PowerSettingsNew />}
                                    onClick={handleEndSessionClick}
                                    disabled={isEnding}
                                    sx={{
                                        color: 'white',
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        '&:hover': {
                                            borderColor: '#ef4444',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)'
                                        }
                                    }}
                                >
                                    {isEnding ? 'Fermeture...' : 'Quitter'}
                                </Button>
                            )}
                        </Box>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="xl" sx={{ py: 3 }}>
                    {!isAuthenticated ? (
                        <Fade in={true} timeout={800}>
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
                                <ConnectionManager 
                                    onConnect={handleConnect}
                                    connectionState={connectionState}
                                    defaultServer={sessionData?.serverAddress}
                                />
                            </Box>
                        </Fade>
                    ) : (
                        <Slide direction="up" in={true} timeout={600}>
                            <Grid container spacing={3}>
                                {/* Vos composants existants... */}
                                <Grid item xs={12}>
                                    <Stack spacing={2}>
                                        <ControlPanel 
                                            hasControl={hasControl}
                                            onRequestControl={handleRequestControl}
                                            onReleaseControl={handleReleaseControl}
                                        />
                                        <QueueStatus 
                                            hasControl={hasControl}
                                            queuePosition={queuePosition}
                                        />
                                    </Stack>
                                </Grid>
                                
                                <Grid item xs={12} lg={8}>
                                    <ScreenViewer 
                                        screenData={screenData}
                                        hasControl={hasControl}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} lg={4}>
                                    <Stack spacing={2}>
                                        {/* Vos composants de statistiques existants... */}
                                        <Paper sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Speed />
                                                Statistiques en temps réel
                                            </Typography>
                                            
                                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                                <Grid item xs={6}>
                                                    <Paper 
                                                        sx={{ 
                                                            p: 2, 
                                                            textAlign: 'center',
                                                            background: 'linear-gradient(45deg, #4caf50, #81c784)',
                                                            color: 'white',
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Typography variant="h4" fontWeight="bold">
                                                            {fps}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            FPS
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Paper 
                                                        sx={{ 
                                                            p: 2, 
                                                            textAlign: 'center',
                                                            background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                                                            color: 'white',
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Typography variant="h4" fontWeight="bold">
                                                            {latency}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            ms
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Paper 
                                                        sx={{ 
                                                            p: 2, 
                                                            textAlign: 'center',
                                                            background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                                                            color: 'white',
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Typography variant="h5" fontWeight="bold">
                                                            {quality}
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            Qualité
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                
                                                <Grid item xs={6}>
                                                    <Paper 
                                                        sx={{ 
                                                            p: 2, 
                                                            textAlign: 'center',
                                                            background: 'linear-gradient(45deg, #9c27b0, #ba68c8)',
                                                            color: 'white',
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <Typography variant="h5" fontWeight="bold">
                                                            <Lock />
                                                        </Typography>
                                                        <Typography variant="caption">
                                                            Sécurisé
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            </Grid>
                                        </Paper>

                                        {/* Informations de session */}
                                        <Paper sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <SignalWifi4Bar />
                                                Informations de session
                                            </Typography>
                                            
                                            <Divider sx={{ my: 2 }} />
                                            
                                            <Stack spacing={2}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Nom d'affichage
                                                    </Typography>
                                                    <Chip label={sessionData?.displayName} size="small" color="primary" />
                                                </Box>
                                                
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Serveur
                                                    </Typography>
                                                    <Chip label={sessionData?.serverAddress} size="small" color="info" />
                                                </Box>
                                                
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Durée de session
                                                    </Typography>
                                                    <Chip 
                                                        label={sessionData ? `${Math.floor((Date.now() - sessionData.startTime) / 60000)} min` : '0 min'} 
                                                        size="small" 
                                                        color="success" 
                                                    />
                                                </Box>
                                                
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        Chiffrement
                                                    </Typography>
                                                    <Chip label="AES-256" size="small" color="success" />
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Slide>
                    )}
                </Container>

                {/* Composants flottants */}
                <ChatComponent 
                    socketService={SocketService.getInstance()}
                    isAuthenticated={isAuthenticated}
                />

                <FileTransferComponent
                    socketService={SocketService.getInstance()}
                    isAuthenticated={isAuthenticated}
                />

                {/* Dialog d'authentification */}
                <AuthenticationDialog
                    open={showAuthDialog}
                    onAuthenticate={handleAuthenticate}
                    onCancel={handleCancelAuth}
                    isConnecting={isAuthenticating}
                    error={authError}
                    defaultDisplayName={sessionData?.displayName}
                />

                {/* NOUVEAU : Dialog de confirmation de fermeture de session */}
                <Dialog
                    open={showEndSessionDialog}
                    onClose={handleCancelEndSession}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExitToApp color="error" />
                        Fermer la session
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Êtes-vous sûr de vouloir fermer cette session de partage d'écran ? 
                            Vous serez déconnecté et redirigé vers la page d'accueil.
                        </DialogContentText>
                        {sessionData && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Session actuelle :</strong><br />
                                    Nom : {sessionData.displayName}<br />
                                    Serveur : {sessionData.serverAddress}<br />
                                    Durée : {Math.floor((Date.now() - sessionData.startTime) / 60000)} minutes
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelEndSession} color="primary">
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleConfirmEndSession} 
                            color="error" 
                            variant="contained"
                            startIcon={<PowerSettingsNew />}
                        >
                            Fermer la session
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Notifications */}
                <Snackbar
                    open={notification.open}
                    autoHideDuration={4000}
                    onClose={handleCloseNotification}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    sx={{ zIndex: 1400 }}
                >
                    <Alert 
                        onClose={handleCloseNotification} 
                        severity={notification.severity}
                        variant="filled"
                        sx={{ 
                            borderRadius: 2,
                            fontWeight: 600,
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                            minWidth: 300
                        }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
}

export default RemoteDesktopApp;
