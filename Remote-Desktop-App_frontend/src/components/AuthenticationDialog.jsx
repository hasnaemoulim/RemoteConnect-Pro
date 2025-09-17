import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    TextField,
    Button,
    Box,
    Typography,
    Alert,
    CircularProgress,
    Slide,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Chip
} from '@mui/material';
import {
    Security,
    Visibility,
    VisibilityOff,
    Close,
    VpnKey,
    Person,
    Login,
    ContentCopy,
    CheckCircle
} from '@mui/icons-material';
import SocketService from '../services/SocketService';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const AuthenticationDialog = ({ open, onAuthenticate, onCancel, isConnecting, error }) => {
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [passwordCopied, setPasswordCopied] = useState(false);

    // ✅ NOUVEAU : Écouter le mot de passe généré
    useEffect(() => {
        const socketService = SocketService.getInstance();
        
        const handlePasswordGenerated = (generatedPwd) => {
            setGeneratedPassword(generatedPwd);
            setPassword(generatedPwd); // Pré-remplir automatiquement
            console.log('🔑 Mot de passe généré affiché:', generatedPwd);
        };

        socketService.on('passwordGenerated', handlePasswordGenerated);

        return () => {
            socketService.off('passwordGenerated', handlePasswordGenerated);
        };
    }, []);

    // ✅ NOUVEAU : Fonction pour copier le mot de passe
    const copyPassword = async () => {
        try {
            await navigator.clipboard.writeText(generatedPassword);
            setPasswordCopied(true);
            setTimeout(() => setPasswordCopied(false), 2000);
        } catch (err) {
            console.error('Erreur copie:', err);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setLocalError('Mot de passe requis');
            return;
        }
        if (!displayName.trim()) {
            setLocalError('Nom d\'affichage requis');
            return;
        }
        setLocalError('');
        onAuthenticate(password, displayName.trim());
    };

    return (
        <Dialog
            open={open}
            TransitionComponent={Transition}
            keepMounted
            onClose={!isConnecting ? onCancel : undefined}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(34, 197, 94, 0.1)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogContent sx={{ p: 0 }}>
                {/* Header moderne avec dégradé */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #232e4d 0%, #25325a 100%)',
                        color: 'white',
                        p: 3,
                        position: 'relative',
                        textAlign: 'center'
                    }}
                >
                    {!isConnecting && (
                        <IconButton
                            onClick={onCancel}
                            sx={{ 
                                position: 'absolute', 
                                right: 8, 
                                top: 8,
                                color: 'white',
                                '&:hover': { background: 'rgba(255,255,255,0.1)' }
                            }}
                        >
                            <Close />
                        </IconButton>
                    )}
                    
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2
                        }}
                    >
                        <Security sx={{ fontSize: 32 }} />
                    </Box>
                    
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Authentification
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Entrez vos informations pour rejoindre la session
                    </Typography>
                </Box>

                {/* Formulaire compact */}
                <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                        {/* ✅ NOUVEAU : Affichage du mot de passe généré */}
                        {generatedPassword && (
                            <Paper
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                    border: '2px solid rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                <Typography variant="body2" color="primary" fontWeight="bold" gutterBottom>
                                    🔑 Mot de passe généré par le serveur
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Chip 
                                        label={generatedPassword}
                                        sx={{ 
                                            fontFamily: 'monospace',
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            background: 'white',
                                            color: 'black',
                                            border: '1px solid rgba(34, 197, 94, 0.3)'
                                        }}
                                    />
                                    <IconButton 
                                        onClick={copyPassword}
                                        size="small"
                                        sx={{ 
                                            color: passwordCopied ? 'success.main' : 'primary.main',
                                            '&:hover': { background: 'rgba(34, 197, 94, 0.1)' }
                                        }}
                                    >
                                        {passwordCopied ? <CheckCircle /> : <ContentCopy />}
                                    </IconButton>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Ce mot de passe a été automatiquement généré pour cette session
                                </Typography>
                            </Paper>
                        )}

                        {/* Champ nom d'affichage */}
                        <TextField
  fullWidth
  label="Nom d'affichage"
  value={displayName}
  onChange={(e) => setDisplayName(e.target.value)}
  disabled={isConnecting}
  placeholder="Ex: Jean Dupont"
  variant="outlined"
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <Person color="primary" />
      </InputAdornment>
    )
  }}
  sx={{
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      background: '#fff',
    },
    '& .MuiInputBase-input': {
      color: '#232e4d',
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': {
      color: '#60a5fa',
      fontWeight: 600,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#bae6fd',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    '& input::placeholder': {
      color: '#3f3f46',
      opacity: 1,
    },
  }}
/>


                        {/* Champ mot de passe */}
                        <TextField
  fullWidth
  label="Mot de passe"
  type={showPassword ? 'text' : 'password'}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  disabled={isConnecting}
  placeholder="Entrez le mot de passe généré"
  variant="outlined"
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <VpnKey color="primary" />
      </InputAdornment>
    ),
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    )
  }}
  sx={{
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      background: '#fff',
    },
    '& .MuiInputBase-input': {
      color: '#232e4d',
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': {
      color: '#60a5fa',
      fontWeight: 600,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#bae6fd',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    '& input::placeholder': {
      color: '#3f3f46',
      opacity: 1,
    },
  }}
/>


                        {/* Message d'erreur */}
                        {(error || localError) && (
                            <Alert 
                                severity="error" 
                                sx={{ 
                                    borderRadius: 2,
                                    '& .MuiAlert-icon': {
                                        color: '#ef4444'
                                    }
                                }}
                            >
                                {error || localError}
                            </Alert>
                        )}

                        {/* Info sécurité */}
                        <Paper
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}
                        >
                            <Typography variant="body2" color="primary" fontWeight="medium" gutterBottom>
                                🔒 Connexion sécurisée
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Chaque session utilise un mot de passe unique généré automatiquement pour une sécurité maximale
                            </Typography>
                        </Paper>

                        {/* Boutons */}
                        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                            <Button
                                onClick={onCancel}
                                disabled={isConnecting}
                                variant="outlined"
                                fullWidth
                                sx={{ 
                                    borderRadius: 3,
                                    py: 1.5,
                                    borderColor: '#d1d5db',
                                    color: '#6b7280',
                                    '&:hover': {
                                        borderColor: '#9ca3af',
                                        background: '#f9fafb'
                                    }
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={isConnecting || !password.trim() || !displayName.trim()}
                                variant="contained"
                                fullWidth
                                sx={{
                                    borderRadius: 3,
                                    py: 1.5,
                                    background: 'linear-gradient(135deg, #38bdf8, #2ee7e7)',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #2ee7e7, #38bdf8)',
                                        boxShadow: '0 6px 16px rgba(34, 197, 94, 0.4)'
                                    },
                                    '&:disabled': {
                                        background: '#d1d5db',
                                        boxShadow: 'none'
                                    }
                                }}
                                startIcon={isConnecting ? 
                                    <CircularProgress size={20} color="inherit" /> : 
                                    <Login />
                                }
                            >
                                {isConnecting ? 'Connexion...' : 'Se connecter'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default AuthenticationDialog;
