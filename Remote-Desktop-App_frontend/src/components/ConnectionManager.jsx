import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Computer,
  Wifi,
  Security,
  Speed,
  CloudQueue,
  CheckCircle
} from '@mui/icons-material';

const ConnectionManager = ({ onConnect, connectionState }) => {
  const [serverAddress, setServerAddress] = useState('192.168.1.103');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (serverAddress.trim()) {
      setIsConnecting(true);
      onConnect(serverAddress.trim());
      setTimeout(() => setIsConnecting(false), 3000);
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'CONNECTING': return 'warning';
      case 'CONNECTED': return 'success';
      case 'AUTHENTICATED': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'CONNECTING': return 'Connexion...';
      case 'CONNECTED': return 'Connecté';
      case 'WAITING_APPROVAL': return 'En attente d\'approbation';
      case 'AUTHENTICATED': return 'Authentifié';
      default: return 'Déconnecté';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #232e4d 0%, #25325a 100%)' // Bleu foncé landing
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          borderRadius: 5,
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(56,189,248,0.13)',
          boxShadow: '0 20px 40px rgba(56,189,248,0.12)',
          animation: 'slideInUp 0.6s ease-out'
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          {/* Header moderne */}
          <Box textAlign="center" mb={3}>
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: '50%',
                background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
                color: 'white',
                mb: 2,
                boxShadow: 3
              }}
            >
              <Computer sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" sx={{
              background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }} gutterBottom>
              RemoteConnect Pro
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Connexion sécurisée au serveur de partage d'écran
            </Typography>

            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              sx={{
                mt: 2,
                fontWeight: 'bold',
                fontSize: '1rem',
                px: 2,
                borderRadius: 2,
                background: connectionState === 'CONNECTING'
                  ? 'linear-gradient(90deg, #fbbf24 0%, #fde68a 100%)'
                  : connectionState === 'CONNECTED' || connectionState === 'AUTHENTICATED'
                  ? 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)'
                  : undefined,
                color: connectionState === 'CONNECTING'
                  ? '#b45309'
                  : connectionState === 'CONNECTED' || connectionState === 'AUTHENTICATED'
                  ? 'white'
                  : undefined,
              }}
              icon={connectionState === 'CONNECTING' ? <CircularProgress size={16} /> : <CheckCircle />}
            />
          </Box>

          <form onSubmit={handleSubmit}>
            <Box mb={3}>
              <TextField
  fullWidth
  label="Adresse du serveur"
  value={serverAddress}
  onChange={(e) => setServerAddress(e.target.value)}
  disabled={isConnecting}
  placeholder="192.168.1.100 ou nom.domaine.com"
  variant="outlined"
  InputProps={{
    startAdornment: <Wifi color="primary" sx={{ mr: 1 }} />
  }}
  sx={{
    '& .MuiOutlinedInput-root': {
      borderRadius: 3,
      background: '#fff', // fond bien blanc
    },
    '& .MuiInputBase-input': {
      color: '#232e4d', // texte foncé
      fontWeight: 600,
    },
    '& .MuiInputLabel-root': {
      color: '#60a5fa', // label bleu landing (optionnel)
      fontWeight: 600,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#bae6fd', // bordure bleu clair
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#38bdf8',
    },
    // Placeholder couleur foncée
    '& input::placeholder': {
      color: '#3f3f46',
      opacity: 1,
    },
  }}
/>

            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isConnecting || !serverAddress.trim()}
              sx={{
                py: 1.5,
                borderRadius: 3,
                background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)'
                },
                fontWeight: 700,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(56,189,248,0.2)'
              }}
              startIcon={isConnecting ? <CircularProgress size={20} color="inherit" /> : <Computer />}
            >
              {isConnecting ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{
              background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Fonctionnalités
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Security color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Chiffrement AES-256"
                  secondary="Sécurité de niveau militaire"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Speed color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Faible latence"
                  secondary="Optimisé pour la fluidité"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CloudQueue color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Multi-plateforme"
                  secondary="Compatible tous appareils"
                />
              </ListItem>
            </List>
          </Box>

          <Alert
            severity="info"
            sx={{
              mt: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #e0f2fe, #f3e8ff)'
            }}
          >
            💡 Assurez-vous que le serveur Java est démarré sur le port 8081
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConnectionManager;
