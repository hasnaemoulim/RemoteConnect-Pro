import React, { useState, useEffect } from 'react';
import {
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Chip,
    Typography,
    Box,
    IconButton,
    Badge,
    Divider,
    Paper,
    Stack
} from '@mui/material';
import {
    People,
    Close,
    SportsEsports,
    Visibility,
    Person,
    AdminPanelSettings,
    Computer,
    Refresh
} from '@mui/icons-material';

const UserListComponent = ({ socketService, isAuthenticated }) => {
    const [open, setOpen] = useState(false);
    const [userList, setUserList] = useState([]);
    const [currentUserId, setCurrentUserId] = useState('');

    useEffect(() => {
        if (!socketService || !isAuthenticated) return;

        const handleUserList = (users) => {
            console.log('👥 Mise à jour liste utilisateurs:', users);
            setUserList(users || []);
        };

        const handleClientId = (clientId) => {
            setCurrentUserId(clientId);
        };

        socketService.on('userList', handleUserList);
        socketService.on('clientId', handleClientId);

        // Demander la liste initiale
        socketService.requestUserList();

        return () => {
            socketService.off('userList', handleUserList);
            socketService.off('clientId', handleClientId);
        };
    }, [socketService, isAuthenticated]);

    const handleOpen = () => {
        setOpen(true);
        // Actualiser la liste quand on ouvre
        if (socketService && isAuthenticated) {
            socketService.requestUserList();
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleRefresh = () => {
        if (socketService && isAuthenticated) {
            socketService.requestUserList();
        }
    };

    const getAvatarColor = (userId, hasControl) => {
        if (hasControl) return '#4caf50'; // Vert pour contrôle
        if (userId === currentUserId) return '#2196f3'; // Bleu pour soi-même
        return '#00003'; // Gris pour spectateurs
    };

    const getStatusIcon = (hasControl) => {
        return hasControl ? <SportsEsports /> : <Visibility />;
    };

    const getStatusColor = (hasControl) => {
        return hasControl ? 'success' : 'default';
    };

    if (!isAuthenticated) return null;

    return (
        <>
            {/* Bouton flottant pour ouvrir la liste */}
            <Fab
                color="primary"
                aria-label="users"
                onClick={handleOpen}
                 sx={{
                    position: 'fixed',
        bottom: 260, // ✅ CHANGÉ : Position plus haute
        right: 24,
        zIndex: 1000,
                    background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #1976d2, #0288d1)',
                        transform: 'scale(1.1)'
                    }
                }}
            >
                <Badge badgeContent={userList.length} color="error">
                    <People />
                </Badge>
            </Fab>

            {/* Dialog de la liste des utilisateurs */}
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'linear-gradient(45deg, #2196f3, #21cbf3)',
                        color: 'white',
                        fontWeight: 'bold'
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <People />
                        <Typography variant="h6" fontWeight="bold">
                            Utilisateurs connectés ({userList.length})
                        </Typography>
                    </Box>
                    <Box>
                        <IconButton 
                            onClick={handleRefresh} 
                            sx={{ color: 'white', mr: 1 }}
                            title="Actualiser"
                        >
                            <Refresh />
                        </IconButton>
                        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 0 }}>
                    {userList.length === 0 ? (
                        <Box 
                            display="flex" 
                            flexDirection="column" 
                            alignItems="center" 
                            justifyContent="center" 
                            py={4}
                        >
                            <Computer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                Aucun utilisateur connecté
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {userList.map((user, index) => (
                                <React.Fragment key={user.id}>
                                    <ListItem
                                        sx={{
                                            py: 2,
                                            px: 3,
                                            background: user.id === currentUserId 
                                                ? 'linear-gradient(45deg, #e3f2fd, #bbdefb)' 
                                                : 'transparent',
                                            '&:hover': {
                                                background: 'rgba(33, 150, 243, 0.1)'
                                            }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar
                                                sx={{
                                                    bgcolor: getAvatarColor(user.id, user.hasControl),
                                                    width: 48,
                                                    height: 48,
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {user.id === currentUserId ? (
                                                    <AdminPanelSettings />
                                                ) : (
                                                    <Person />
                                                )}
                                            </Avatar>
                                        </ListItemAvatar>

                                        <ListItemText
                                            primary={
                                               <Box display="flex" alignItems="center" gap={1}>
      <Typography
        variant="subtitle1"
        fontWeight="bold"
        sx={{ color: "#232e4d" }} // <-- couleur noire/bleu foncé landing
      >
        {user.displayName}
        {user.id === currentUserId && (
          <Typography
            component="span"
            variant="caption"
            sx={{
              ml: 1,
              color: 'primary.main',
              fontWeight: 'bold'
            }}
          >
            (Vous)
          </Typography>
        )}
      </Typography>
    </Box>
                                            }
                                            secondary={
                                                <Stack spacing={1} sx={{ mt: 1 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        ID: {user.id} • IP: {user.ip}
                                                    </Typography>
                                                    <Box display="flex" gap={1}>
                                                        <Chip
                                                            icon={getStatusIcon(user.hasControl)}
                                                            label={user.status}
                                                            size="small"
                                                            color={getStatusColor(user.hasControl)}
                                                            variant={user.hasControl ? "filled" : "outlined"}
                                                        />
                                                        {user.id === currentUserId && (
                                                            <Chip
                                                                label="Vous"
                                                                size="small"
                                                                color="primary"
                                                                variant="filled"
                                                            />
                                                        )}
                                                    </Box>
                                                </Stack>
                                            }
                                        />
                                    </ListItem>
                                    {index < userList.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}

                    {/* Légende */}
                    <Paper 
                        sx={{ 
                            m: 2, 
                            p: 2, 
                            background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)',
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Légende:
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Avatar sx={{ bgcolor: '#4caf50', width: 20, height: 20 }}>
                                    <SportsEsports sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="caption" color="green">Contrôle actif</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Avatar sx={{ bgcolor: '#9e9e9e', width: 20, height: 20 }}>
                                    <Visibility sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="caption" color="black">Spectateur</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <Avatar sx={{ bgcolor: '#2196f3', width: 20, height: 20 }}>
                                    <AdminPanelSettings sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="caption" color="red">Vous</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UserListComponent;
