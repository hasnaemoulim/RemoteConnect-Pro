import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    CircularProgress,
    Fade,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Fab,
    IconButton
} from '@mui/material';
import {
    Computer,
    Speed,
    NetworkCheck,
    SportsEsports,
    Keyboard,
    TouchApp,
    Close,
    KeyboardHide
} from '@mui/icons-material';
import SocketService from '../services/SocketService';

const ScreenViewer = ({ screenData, hasControl }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const hiddenInputRef = useRef(null);
    const forceKeyboardInputRef = useRef(null); // ✅ NOUVEAU : Input caché pour forcer le clavier
    const lastClickTimeRef = useRef(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [fps, setFps] = useState(0);
    const [hasFocus, setHasFocus] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(false);
    const [virtualKeyboardText, setVirtualKeyboardText] = useState('');
    const [lastTapTime, setLastTapTime] = useState(0); // ✅ NOUVEAU : Pour double-tap
    const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
    const lastFrameIdRef = useRef(-1);
    const lastRenderTimeRef = useRef(0);
    const isRenderingRef = useRef(false);
    const RENDER_THROTTLE = 200;

    const socketService = SocketService.getInstance();

    // ✅ DÉTECTION MOBILE
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            setIsMobile(isMobileDevice);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (screenData?.imageUrl && canvasRef.current) {
            const now = Date.now();
            
            if (now - lastRenderTimeRef.current < RENDER_THROTTLE) {
                return;
            }
            
            if (screenData.frameId <= lastFrameIdRef.current) {
                return;
            }
            
            if (isRenderingRef.current) {
                return;
            }
            
            lastFrameIdRef.current = screenData.frameId;
            lastRenderTimeRef.current = now;
            
            renderFrame(screenData);
        }
    }, [screenData?.frameId]);

    const renderFrame = useCallback((data) => {
        if (isRenderingRef.current) return;
        
        isRenderingRef.current = true;
        
        const canvas = canvasRef.current;
        if (!canvas) {
            isRenderingRef.current = false;
            return;
        }

        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                const drawWidth = img.width * scale;
                const drawHeight = img.height * scale;
                const x = (canvas.width - drawWidth) / 2;
                const y = (canvas.height - drawHeight) / 2;
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, x, y, drawWidth, drawHeight);
                
                setImageLoaded(true);
                
                const now = Date.now();
                const counter = fpsCounterRef.current;
                counter.frames++;
                
                if (now - counter.lastTime >= 1000) {
                    setFps(counter.frames);
                    counter.frames = 0;
                    counter.lastTime = now;
                }
                
            } finally {
                isRenderingRef.current = false;
            }
        };
        
        img.onerror = () => {
            setImageLoaded(false);
            isRenderingRef.current = false;
        };
        
        img.src = data.imageUrl;
    }, []);

    const getRelativeCoordinates = useCallback((event) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // ✅ GESTION TOUCH pour mobile
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;
        
        const scaleX = 1280 / rect.width;
        const scaleY = 720 / rect.height;
        
        const finalX = Math.round(canvasX * scaleX);
        const finalY = Math.round(canvasY * scaleY);
        
        const clampedX = Math.max(0, Math.min(1280, finalX));
        const clampedY = Math.max(0, Math.min(720, finalY));
        
        return { x: clampedX, y: clampedY };
    }, []);

    // ✅ NOUVELLE FONCTION : Forcer l'ouverture du clavier mobile
    const forceShowKeyboard = useCallback(() => {
        if (isMobile) {
            console.log('📱 Forcer l\'ouverture du clavier mobile');
            
            // Méthode 1 : Focus sur input caché
            if (forceKeyboardInputRef.current) {
                forceKeyboardInputRef.current.focus();
                forceKeyboardInputRef.current.click();
            }
            
            // Méthode 2 : Ouvrir immédiatement le clavier virtuel
            setTimeout(() => {
                setShowVirtualKeyboard(true);
            }, 100);
        }
    }, [isMobile]);

    // ✅ NOUVEAU : Gestionnaire de double-tap pour mobile
    const handleDoubleTap = useCallback((event) => {
        if (!hasControl || !isMobile) return;
        
        const now = Date.now();
        const timeDiff = now - lastTapTime;
        
        if (timeDiff < 300) { // Double-tap détecté
            event.preventDefault();
            event.stopPropagation();
            
            console.log('📱 Double-tap détecté - Ouverture clavier');
            forceShowKeyboard();
        } else {
            // Simple tap - traiter comme clic normal
            handleMouseClick(event);
        }
        
        setLastTapTime(now);
    }, [hasControl, isMobile, lastTapTime]);

    // ✅ GESTIONNAIRES DE SOURIS/TOUCH CORRIGÉS
    const handleMouseClick = useCallback((event) => {
        if (!hasControl) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        // ✅ ÉVITER les clics multiples rapides
        const now = Date.now();
        if (now - lastClickTimeRef.current < 300) {
            console.log('🚫 Clic ignoré (trop rapide)');
            return;
        }
        lastClickTimeRef.current = now;

        const coords = getRelativeCoordinates(event);

        const inputEvent = {
            type: 'MOUSE_CLICK',
            x: coords.x,
            y: coords.y,
            button: event.button || 0,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);

        // ✅ MOBILE : Ouvrir IMMÉDIATEMENT le clavier virtuel
        if (isMobile) {
            forceShowKeyboard();
        } else if (containerRef.current) {
            containerRef.current.focus();
        }
    }, [hasControl, getRelativeCoordinates, socketService, isMobile, forceShowKeyboard]);

    // ✅ GESTIONNAIRES TOUCH CORRIGÉS pour mobile
    const handleTouchStart = useCallback((event) => {
        if (!hasControl) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const coords = getRelativeCoordinates(event);

        const inputEvent = {
            type: 'MOUSE_PRESS',
            x: coords.x,
            y: coords.y,
            button: 0,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);
    }, [hasControl, getRelativeCoordinates, socketService]);

    const handleTouchEnd = useCallback((event) => {
        if (!hasControl) return;
        
        event.preventDefault();
        event.stopPropagation();
        
        const coords = getRelativeCoordinates(event);
        
        const inputEvent = {
            type: 'MOUSE_RELEASE',
            x: coords.x,
            y: coords.y,
            button: 0,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);
        
        // ✅ NOUVEAU : Ouvrir IMMÉDIATEMENT le clavier après touch
        if (isMobile) {
            forceShowKeyboard();
        }
        
    }, [hasControl, socketService, isMobile, forceShowKeyboard, getRelativeCoordinates]);

    // ✅ GESTIONNAIRES DE CLAVIER DESKTOP
    const handleKeyDown = useCallback((event) => {
        if (!hasControl || !hasFocus || isMobile) return;

        event.preventDefault();
        event.stopPropagation();

        console.log('🎯 Touche pressée:', event.key, 'Code:', event.keyCode);

        const inputEvent = {
            type: 'KEY_PRESS',
            keyCode: event.keyCode,
            key: event.key,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);
    }, [hasControl, hasFocus, socketService, isMobile]);

    const handleKeyUp = useCallback((event) => {
        if (!hasControl || !hasFocus || isMobile) return;

        event.preventDefault();
        event.stopPropagation();

        const inputEvent = {
            type: 'KEY_RELEASE',
            keyCode: event.keyCode,
            key: event.key,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);
    }, [hasControl, hasFocus, socketService, isMobile]);

    // ✅ GESTIONNAIRE clavier virtuel mobile amélioré
    const handleVirtualKeyboardChange = useCallback((event) => {
        const newText = event.target.value;
        const addedText = newText.slice(virtualKeyboardText.length);
        
        if (addedText && hasControl) {
            // Simuler la frappe de chaque caractère ajouté
            for (let i = 0; i < addedText.length; i++) {
                const char = addedText[i];
                
                setTimeout(() => {
                    // Simuler KEY_PRESS avec le caractère
                    const inputEvent = {
                        type: 'KEY_PRESS',
                        keyCode: char.charCodeAt(0),
                        key: char,
                        ctrlKey: false,
                        shiftKey: false,
                        altKey: false,
                        timestamp: Date.now()
                    };

                    socketService.sendInputEvent(inputEvent);
                    
                    // Simuler KEY_RELEASE
                    setTimeout(() => {
                        const releaseEvent = {
                            type: 'KEY_RELEASE',
                            keyCode: char.charCodeAt(0),
                            key: char,
                            timestamp: Date.now()
                        };
                        socketService.sendInputEvent(releaseEvent);
                    }, 50);
                }, i * 100); // ✅ RÉDUIT : Délai entre caractères
            }
        }
        
        setVirtualKeyboardText(newText);
    }, [hasControl, socketService, virtualKeyboardText]);

    // ✅ NOUVELLE FONCTION : Simuler touches spéciales
    const simulateSpecialKey = useCallback((keyCode, keyName) => {
        if (!hasControl) return;
        
        const inputEvent = {
            type: 'KEY_PRESS',
            keyCode: keyCode,
            key: keyName,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            timestamp: Date.now()
        };

        socketService.sendInputEvent(inputEvent);
        
        setTimeout(() => {
            const releaseEvent = {
                type: 'KEY_RELEASE',
                keyCode: keyCode,
                key: keyName,
                timestamp: Date.now()
            };
            socketService.sendInputEvent(releaseEvent);
        }, 50);
    }, [hasControl, socketService]);

    // ✅ GESTIONNAIRES DE FOCUS
    const handleFocus = useCallback(() => {
        if (!isMobile) {
            setHasFocus(true);
            console.log('🎯 ScreenViewer a obtenu le focus');
        }
    }, [isMobile]);

    const handleBlur = useCallback(() => {
        if (!isMobile) {
            setHasFocus(false);
            console.log('🎯 ScreenViewer a perdu le focus');
        }
    }, [isMobile]);

    const handleContainerClick = useCallback(() => {
        if (hasControl && containerRef.current && !isMobile) {
            containerRef.current.focus();
        }
    }, [hasControl, isMobile]);

    // ✅ EFFET : Ajouter les gestionnaires d'événements
    useEffect(() => {
        if (!hasControl) return;

        const container = containerRef.current;
        if (!container) return;

        if (isMobile) {
            // ✅ MOBILE : Gestionnaires touch
            container.addEventListener('touchstart', handleTouchStart, { passive: false });
            container.addEventListener('touchend', handleTouchEnd, { passive: false });
        } else {
            // ✅ DESKTOP : Gestionnaires clavier
            container.addEventListener('keydown', handleKeyDown, { passive: false });
            container.addEventListener('keyup', handleKeyUp, { passive: false });
            container.addEventListener('focus', handleFocus);
            container.addEventListener('blur', handleBlur);
            container.focus();
        }

        return () => {
            if (isMobile) {
                container.removeEventListener('touchstart', handleTouchStart);
                container.removeEventListener('touchend', handleTouchEnd);
            } else {
                container.removeEventListener('keydown', handleKeyDown);
                container.removeEventListener('keyup', handleKeyUp);
                container.removeEventListener('focus', handleFocus);
                container.removeEventListener('blur', handleBlur);
            }
        };
    }, [hasControl, isMobile, handleKeyDown, handleKeyUp, handleFocus, handleBlur, handleTouchStart, handleTouchEnd]);

    return (
        <>
            {/* ✅ NOUVEAU : Input caché pour forcer le clavier mobile */}
            {isMobile && (
                <input
                    ref={forceKeyboardInputRef}
                    type="text"
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        opacity: 0,
                        pointerEvents: 'none',
                        zIndex: -1
                    }}
                    onFocus={() => {
                        setTimeout(() => {
                            setShowVirtualKeyboard(true);
                            if (forceKeyboardInputRef.current) {
                                forceKeyboardInputRef.current.blur();
                            }
                        }, 200);
                    }}
                />
            )}

            <Card
                sx={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: hasControl ? '3px solid #4caf50' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: hasControl ? '0 0 20px rgba(76, 175, 80, 0.3)' : 'none',
                    width: '100%',
                    maxWidth: isMobile ? '100vw' : 'none'
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    <Box
                        sx={{
                            background: 'linear-gradient(90deg, #1976d2, #1565c0)',
                            color: 'white',
                            p: isMobile ? 1 : 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap'
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <Computer />
                            <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold">
                                Écran Partagé
                            </Typography>
                        </Box>
                        
                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Chip
                                icon={<Speed />}
                                label={`${fps} FPS`}
                                size="small"
                                sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                            <Chip
                                icon={<NetworkCheck />}
                                label="HD"
                                size="small"
                                sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                            />
                        </Box>
                    </Box>

                    {/* ✅ CONTAINER PRINCIPAL avec gestion mobile/desktop */}
                    <Box
                        ref={containerRef}
                        tabIndex={isMobile ? -1 : 0}
                        onClick={handleContainerClick}
                        onFocus={!isMobile ? handleFocus : undefined}
                        onBlur={!isMobile ? handleBlur : undefined}
                        sx={{
                            background: '#000',
                            minHeight: isMobile ? '50vh' : 400,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            outline: 'none',
                            '&:focus': {
                                outline: hasControl && !isMobile ? '2px solid #4caf50' : 'none'
                            },
                            width: '100%',
                            overflow: 'hidden'
                        }}
                    >
                        {/* ✅ INDICATEURS D'ÉTAT adaptés mobile */}
                        {hasControl && !isMobile && hasFocus && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    zIndex: 10,
                                    background: 'rgba(76, 175, 80, 0.9)',
                                    color: 'white',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                }}
                            >
                                <Keyboard sx={{ fontSize: 14 }} />
                                Clavier actif
                            </Box>
                        )}

                        {hasControl && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                    background: 'rgba(33, 150, 243, 0.9)',
                                    color: 'white',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                }}
                            >
                                {isMobile ? <TouchApp sx={{ fontSize: 14 }} /> : <Computer sx={{ fontSize: 14 }} />}
                                {isMobile ? 'Touch actif' : 'Souris active'}
                            </Box>
                        )}

                        {screenData?.imageUrl ? (
                            <canvas
                                ref={canvasRef}
                                width={isMobile ? 360 : 480}
                                height={isMobile ? 200 : 270}
                                onMouseMove={!isMobile ? undefined : undefined}
                                onClick={!isMobile ? handleMouseClick : handleDoubleTap} // ✅ CHANGÉ pour mobile
                                onTouchStart={isMobile ? handleTouchStart : undefined}
                                onTouchEnd={isMobile ? handleTouchEnd : undefined}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    cursor: hasControl ? 'crosshair' : 'not-allowed',
                                    borderRadius: '8px',
                                    userSelect: 'none',
                                    pointerEvents: hasControl ? 'auto' : 'none',
                                    // ✅ CHANGÉ : touchAction pour permettre les gestes
                                    touchAction: isMobile ? 'manipulation' : 'none',
                                    width: isMobile ? '100%' : 'auto',
                                    height: isMobile ? 'auto' : 'auto'
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 2,
                                    color: '#888',
                                    p: 4,
                                    textAlign: 'center'
                                }}
                            >
                                <Computer sx={{ fontSize: isMobile ? 60 : 80, opacity: 0.5 }} />
                                <Typography variant={isMobile ? "body1" : "h6"} color="inherit">
                                    En attente des données d'écran
                                </Typography>
                                <CircularProgress sx={{ color: '#888' }} />
                            </Box>
                        )}
                        
                        {hasControl && imageLoaded && (
                            <Fade in={true}>
                                <Chip
                                    icon={<SportsEsports />}
                                    label="Contrôle actif"
                                    color="success"
                                    size={isMobile ? "small" : "medium"}
                                    sx={{
                                        position: 'absolute',
                                        bottom: 16,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontWeight: 'bold',
                                        animation: 'pulse 2s infinite'
                                    }}
                                />
                            </Fade>
                        )}
                    </Box>

                    {/* ✅ INSTRUCTIONS adaptées mobile/desktop */}
                    {hasControl && (
                        <Box
                            sx={{
                                p: isMobile ? 1 : 2,
                                background: 'linear-gradient(45deg, #e8f5e8, #f1f8e9)',
                                borderTop: '1px solid rgba(76, 175, 80, 0.2)'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                <SportsEsports sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                                {isMobile 
                                    ? 'Touchez l\'écran pour interagir • Double-touchez pour le clavier'
                                    : 'Cliquez sur l\'écran pour activer le contrôle clavier • Souris et clavier fonctionnels'
                                }
                            </Typography>
                            {isMobile && (
                                <Button
                                    variant="contained"
                                    size="medium"
                                    onClick={() => setShowVirtualKeyboard(true)}
                                    startIcon={<Keyboard />}
                                    sx={{ 
                                        mt: 1, 
                                        width: '100%',
                                        background: 'linear-gradient(45deg, #9c27b0, #e91e63)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #7b1fa2, #c2185b)'
                                        }
                                    }}
                                >
                                    Ouvrir le clavier pour écrire
                                </Button>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* ✅ BOUTON FLOTTANT CLAVIER MOBILE AMÉLIORÉ */}
            {isMobile && hasControl && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1500,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                    }}
                >
                    <Fab
                        color="secondary"
                        size="large"
                        onClick={() => setShowVirtualKeyboard(true)}
                        sx={{
                            background: 'linear-gradient(45deg, #9c27b0, #e91e63)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #7b1fa2, #c2185b)',
                                transform: 'scale(1.1)'
                            },
                            // ✅ NOUVEAU : Animation pour attirer l'attention
                            animation: showVirtualKeyboard ? 'none' : 'pulse 2s infinite'
                        }}
                    >
                        <Keyboard sx={{ fontSize: 28 }} />
                    </Fab>
                    
                    {/* ✅ NOUVEAU : Indicateur de statut */}
                    <Chip
                        label="Appuyez pour clavier"
                        size="small"
                        sx={{
                            background: 'rgba(156, 39, 176, 0.9)',
                            color: 'white',
                            fontSize: '0.7rem',
                            textAlign: 'center'
                        }}
                    />
                </Box>
            )}

            {/* ✅ CLAVIER VIRTUEL AMÉLIORÉ POUR MOBILE */}
            <Dialog
                open={showVirtualKeyboard}
                onClose={() => setShowVirtualKeyboard(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        position: 'fixed',
                        bottom: 0,
                        m: 0,
                        borderRadius: '16px 16px 0 0',
                        maxHeight: '60vh'
                    }
                }}
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Keyboard />
                            <Typography variant="h6">Clavier virtuel</Typography>
                        </Box>
                        <IconButton onClick={() => setShowVirtualKeyboard(false)}>
                            <KeyboardHide />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        ref={hiddenInputRef}
                        autoFocus
                        fullWidth
                        multiline
                        rows={2}
                        value={virtualKeyboardText}
                        onChange={handleVirtualKeyboardChange}
                        placeholder="Tapez votre texte ici pour l'envoyer à l'écran distant..."
                        variant="outlined"
                        sx={{ mt: 1 }}
                    />
                    
                    {/* ✅ TOUCHES SPÉCIALES */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => simulateSpecialKey(13, 'Enter')}
                        >
                            Entrée
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => simulateSpecialKey(8, 'Backspace')}
                        >
                            ⌫ Effacer
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => simulateSpecialKey(32, ' ')}
                        >
                            Espace
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => simulateSpecialKey(9, 'Tab')}
                        >
                            Tab
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowVirtualKeyboard(false)}>
                        Fermer
                    </Button>
                    <Button 
                        onClick={() => setVirtualKeyboardText('')}
                        color="warning"
                    >
                        Tout effacer
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ScreenViewer;