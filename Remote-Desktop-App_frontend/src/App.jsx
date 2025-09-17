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
    DialogActions,
    DialogContentText,
    useMediaQuery,
    useTheme
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
    ExitToApp
} from '@mui/icons-material';
import LandingPage from './components/LandingPage';
import ConnectionManager from './components/ConnectionManager';
import ScreenViewer from './components/ScreenViewer';
import ControlPanel from './components/ControlPanel';
import QueueStatus from './components/QueueStatus';
import AuthenticationDialog from './components/AuthenticationDialog';
import ChatComponent from './components/ChatComponent';
import FileTransferComponent from './components/FileTransferComponent';
import UserListComponent from './components/UserListComponent';
import SocketService from './services/SocketService';

const theme = createTheme({
    palette: {
        primary: {
            main: '#38bdf8',      // BLEU landing
            light: '#60a5fa',
            dark: '#0ea5e9',
            contrastText: '#ffffff'
        },
        secondary: {
            main: '#a78bfa',      // Violet landing
            light: '#c4b5fd',
            dark: '#7c3aed',
            contrastText: '#ffffff'
        },
        success: {
            main: '#22c55e',
            light: '#4ade80',
            dark: '#16a34a'
        },
        warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706'
        },
        error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#dc2626'
        },
        info: {
            main: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2'
        },
        background: {
            default: '#232e4d',   // Fond bleu foncé
            paper: '#25325a'
        },
        text: {
            primary: '#f8fafc',
            secondary: '#a1a1aa'
        }
    },
    typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
        h4: { fontWeight: 700, fontSize: '2.125rem' },
        h5: { fontWeight: 600, fontSize: '1.5rem' },
        h6: { fontWeight: 600, fontSize: '1.25rem' },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }
    },
    shape: { borderRadius: 12 },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(0, 0, 0, 0.08)'
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '12px 24px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    borderRadius: 20,
                    height: 32
                }
            }
        },
        MuiFab: {
            styleOverrides: {
                root: {
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 6px 25px rgba(0, 0, 0, 0.2)'
                    }
                }
            }
        }
    }
});


function App() {
    // ✅ DÉTECTION MOBILE avec useMediaQuery
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    
    // États existants
    const [showLanding, setShowLanding] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionApproved, setConnectionApproved] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasControl, setHasControl] = useState(false);
    const [screenData, setScreenData] = useState(null);
    const [clientId, setClientId] = useState('');
    const [connectionState, setConnectionState] = useState('CLOSED');
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [queuePosition, setQueuePosition] = useState(-1);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [fps, setFps] = useState(0);
    const [latency, setLatency] = useState(0);
    const [quality, setQuality] = useState('HD');

    // ✅ NOUVEAUX ÉTATS : Pour la gestion de la fermeture de session
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleGetStarted = () => {
        setShowLanding(false);
    };

    // ✅ FONCTION : Vérifier si l'utilisateur est complètement authentifié
    const isFullyAuthenticated = () => {
        return isConnected && 
               isAuthenticated && 
               connectionApproved && 
               SocketService.getInstance().isConnected;
    };

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

        // ✅ AMÉLIORATION : Gestionnaire de déconnexion avec nettoyage d'écran
        const handleDisconnected = () => {
            setIsConnected(false);
            setConnectionApproved(false);
            setIsAuthenticated(false);
            setHasControl(false);
            setScreenData(null);
            setShowAuthDialog(false);
            setConnectionState('CLOSED');
            setQueuePosition(-1);
            setIsLoggingOut(false);
            showNotification('Connexion fermée', 'warning');
        };

        // ✅ GESTIONNAIRES : Pour la fermeture de session
        const handleSessionClosedByServer = (reason) => {
            showNotification(`Session fermée par l'administrateur: ${reason}`, 'warning');
            setTimeout(() => {
                resetToLandingPage();
            }, 2000);
        };

        // ✅ AMÉLIORATION : Gestionnaire de confirmation de fermeture
        const handleSessionEndConfirmation = () => {
            setIsLoggingOut(false);
            setScreenData(null);
            showNotification('Session fermée avec succès', 'success');
            
            setTimeout(() => {
                resetToLandingPage();
            }, 1000);
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

        // ✅ NOUVEAU : Gestionnaire pour la liste des utilisateurs
        const handleUserList = (users) => {
            console.log('👥 Liste utilisateurs mise à jour:', users);
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
        socketService.on('sessionEndConfirmation', handleSessionEndConfirmation);
        socketService.on('userList', handleUserList);

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
            socketService.off('sessionEndConfirmation', handleSessionEndConfirmation);
            socketService.off('userList', handleUserList);
            socketService.disconnect();
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setFps(0);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ✅ NOUVELLE FONCTION : Réinitialiser à la page d'accueil
    const resetToLandingPage = () => {
        setShowLanding(true);
        setIsConnected(false);
        setConnectionApproved(false);
        setIsAuthenticated(false);
        setHasControl(false);
        setScreenData(null);
        setShowAuthDialog(false);
        setConnectionState('CLOSED');
        setQueuePosition(-1);
        setClientId('');
        setAuthError('');
        setIsAuthenticating(false);
        setShowLogoutDialog(false);
        setIsLoggingOut(false);
    };

    const handleConnect = (serverAddress) => {
        setConnectionState('CONNECTING');
        showNotification('Connexion en cours...', 'info');
        SocketService.getInstance().connect(serverAddress);
    };

    const handleAuthenticate = (password, displayName) => {
        setIsAuthenticating(true);
        setAuthError('');
        SocketService.getInstance().authenticate(password, displayName);
    };

    const handleCancelAuth = () => {
        setShowAuthDialog(false);
        SocketService.getInstance().disconnect();
        showNotification('Authentification annulée', 'info');
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

    // ✅ NOUVELLES FONCTIONS : Gestion de la fermeture de session
    const handleLogoutClick = () => {
        setShowLogoutDialog(true);
    };

    const handleLogoutConfirm = () => {
        setIsLoggingOut(true);
        setShowLogoutDialog(false);
        showNotification('Fermeture de session en cours...', 'info');
        SocketService.getInstance().endSession();
    };

    const handleLogoutCancel = () => {
        setShowLogoutDialog(false);
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
            
            {showLanding ? (
                <LandingPage onGetStarted={handleGetStarted} />
            ) : (
                 <Box
  sx={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #232e4d 0%, #25325a 100%)', // BLEU landing
    position: 'relative'
  }}
>
                    {/* ✅ APPBAR RESPONSIVE */}
                    <AppBar 
                        position="sticky" 
                        elevation={0}
                        sx={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        <Toolbar sx={{ py: isMobile ? 0.5 : 1 }}>
                            <Box display="flex" alignItems="center" gap={isMobile ? 1 : 2}>
                                <Computer sx={{ color: 'white', fontSize: isMobile ? 24 : 28 }} />
                                <Box>
                                    <Typography 
                                        variant={isMobile ? "subtitle1" : "h6"} 
                                        sx={{ color: 'white', fontWeight: 700, lineHeight: 1 }}
                                    >
                                        RemoteConnect Pro
                                    </Typography>
                                    {!isMobile && (
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                            Partage d'écran sécurisé avec chat et transfert de fichiers
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                            
                            <Box sx={{ 
                                ml: 'auto', 
                                display: 'flex', 
                                gap: isMobile ? 0.5 : 1, 
                                alignItems: 'center',
                                flexWrap: 'wrap'
                            }}>
                                <Chip
                                    icon={status.icon}
                                    label={status.text}
                                    color={status.color}
                                    variant="filled"
                                    size="small"
                                    sx={{ 
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                        '& .MuiChip-icon': { color: 'white' }
                                    }}
                                />
                                
                                {clientId && !isMobile && (
                                    <Chip
                                        label={`ID: ${clientId}`}
                                        variant="outlined"
                                        size="small"
                                        sx={{ 
                                            color: 'white',
                                            borderColor: 'rgba(255, 255, 255, 0.5)',
                                            fontFamily: 'monospace',
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                )}
                                
                                {isAuthenticated && (
                                    <>
                                        <Chip
                                            icon={hasControl ? <SportsEsports /> : <Visibility />}
                                            label={hasControl ? 'Contrôle actif' : 'Mode spectateur'}
                                            color={hasControl ? 'success' : 'default'}
                                            size="small"
                                            sx={{ 
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                '& .MuiChip-icon': { color: 'white' }
                                            }}
                                        />
                                        
                                        {/* ✅ BOUTON DE FERMETURE DE SESSION RESPONSIVE */}
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleLogoutClick}
                                            disabled={isLoggingOut}
                                            startIcon={!isMobile ? <ExitToApp /> : null}
                                            sx={{
                                                color: 'white',
                                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: isMobile ? '0.7rem' : '0.75rem',
                                                minWidth: isMobile ? 'auto' : 'inherit',
                                                px: isMobile ? 1 : 2,
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    background: 'rgba(255, 255, 255, 0.1)'
                                                },
                                                ml: 1
                                            }}
                                        >
                                            {isMobile ? (
                                                <ExitToApp sx={{ fontSize: 16 }} />
                                            ) : (
                                                isLoggingOut ? 'Fermeture...' : 'Quitter'
                                            )}
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Toolbar>
                    </AppBar>

                    {/* ✅ CONTAINER PRINCIPAL RESPONSIVE */}
                    <Container 
                        maxWidth={isMobile ? false : "xl"} 
                        sx={{ 
                            py: isMobile ? 1 : 3,
                            px: isMobile ? 1 : 3,
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        {!isAuthenticated ? (
                            <Fade in={true} timeout={800}>
                                <Box 
                                    display="flex" 
                                    justifyContent="center" 
                                    alignItems="center" 
                                    minHeight={isMobile ? "60vh" : "70vh"}
                                >
                                    <ConnectionManager 
                                        onConnect={handleConnect}
                                        connectionState={connectionState}
                                    />
                                </Box>
                            </Fade>
                        ) : (
                            <Slide direction="up" in={true} timeout={600}>
                                <Grid container spacing={isMobile ? 1 : 3}>
                                    <Grid item xs={12}>
                                        <Stack spacing={isMobile ? 1 : 2}>
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
                                    
                                    {/* ✅ LAYOUT RESPONSIVE : ScreenViewer */}
                                    <Grid item xs={12} lg={isMobile ? 12 : 8}>
                                        <ScreenViewer 
                                            screenData={screenData}
                                            hasControl={hasControl}
                                        />
                                    </Grid>
                                    
                                    {/* ✅ STATISTIQUES : Masquées sur mobile */}
                                    {!isMobile && (
                                        <Grid item xs={12} lg={4}>
                                            <Stack spacing={2}>
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

                                                <Paper sx={{ p: 3 }}>
                                                    <Typography variant="h6" gutterBottom color="primary" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <SignalWifi4Bar />
                                                        Informations de session
                                                    </Typography>
                                                    
                                                    <Divider sx={{ my: 2 }} />
                                                    
                                                    <Stack spacing={2}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Chiffrement
                                                            </Typography>
                                                            <Chip label="AES-256" size="small" color="success" />
                                                        </Box>
                                                        
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Compatibilité
                                                            </Typography>
                                                            <Chip label="International" size="small" color="info" />
                                                        </Box>
                                                        
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Chat en temps réel
                                                            </Typography>
                                                            <Chip label="Actif" size="small" color="success" />
                                                        </Box>
                                                        
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Transfert de fichiers
                                                            </Typography>
                                                            <Chip label="Disponible" size="small" color="primary" />
                                                        </Box>
                                                        
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Optimisation mobile
                                                            </Typography>
                                                            <Chip label="Activée" size="small" color="warning" />
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            </Stack>
                                        </Grid>
                                    )}
                                </Grid>
                            </Slide>
                        )}
                    </Container>

                    {/* ✅ COMPOSANTS FLOTTANTS : Affichés seulement si complètement authentifié */}
                    {isFullyAuthenticated() && (
                        <>
                            <ChatComponent 
                                socketService={SocketService.getInstance()}
                                isAuthenticated={isAuthenticated}
                            />

                            <FileTransferComponent
                                socketService={SocketService.getInstance()}
                                isAuthenticated={isAuthenticated}
                            />

                            <UserListComponent
                                socketService={SocketService.getInstance()}
                                isAuthenticated={isAuthenticated}
                            />
                        </>
                    )}

                    <AuthenticationDialog
                        open={showAuthDialog}
                        onAuthenticate={handleAuthenticate}
                        onCancel={handleCancelAuth}
                        isConnecting={isAuthenticating}
                        error={authError}
                    />

                    {/* ✅ DIALOG DE CONFIRMATION DE FERMETURE DE SESSION */}
                    <Dialog
                        open={showLogoutDialog}
                        onClose={handleLogoutCancel}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ExitToApp color="warning" />
                            Fermer la session
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Êtes-vous sûr de vouloir fermer votre session ? 
                                Vous serez déconnecté et redirigé vers la page d'accueil.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleLogoutCancel} color="inherit">
                                Annuler
                            </Button>
                            <Button 
                                onClick={handleLogoutConfirm} 
                                color="warning" 
                                variant="contained"
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? 'Fermeture...' : 'Confirmer'}
                            </Button>
                        </DialogActions>
                    </Dialog>

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
                                minWidth: isMobile ? 250 : 300
                            }}
                        >
                            {notification.message}
                        </Alert>
                    </Snackbar>
                </Box>
            )}
        </ThemeProvider>
    );
}

export default App;