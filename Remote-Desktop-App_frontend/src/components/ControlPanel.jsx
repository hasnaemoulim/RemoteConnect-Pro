import React from 'react';
import {
    Card,
    CardContent,
    Button,
    Box,
    Typography,
    Chip,
    Divider,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    Gamepad,
    LockOpen,
    Visibility,
    Settings,
    Info
} from '@mui/icons-material';

const ControlPanel = ({ hasControl, onRequestControl, onReleaseControl }) => {
    return (
        <Card
            sx={{
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(56,189,248,0.18)',
                borderRadius: 4,
                boxShadow: '0 8px 24px rgba(56,189,248,0.12)',
                mb: 3,
                transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
                '&:hover': {
                    transform: 'translateY(-3px) scale(1.01)',
                    boxShadow: '0 16px 32px rgba(56,189,248,0.18)',
                }
            }}
        >
            <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight={700} color="primary">
                        Panneau de Contrôle
                    </Typography>
                    <Tooltip title="Informations sur le contrôle">
                        <IconButton size="medium" color="primary" sx={{ '&:hover': { backgroundColor: 'rgba(56,189,248,0.12)' } }}>
                            <Info fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Box display="flex" alignItems="center" gap={3} mb={4} flexWrap="wrap">
                    <Chip
                        icon={hasControl ? <Gamepad /> : <Visibility />}
                        label={hasControl ? 'Contrôle actif' : 'Mode spectateur'}
                        color={hasControl ? 'primary' : 'default'}
                        variant={hasControl ? 'filled' : 'outlined'}
                        sx={{
                            fontWeight: 700,
                            fontSize: 16,
                            minWidth: 160,
                            px: 2,
                            py: 1.2,
                            color: '#000000' ,// bleu clair landing
                            borderRadius: 3,
                            letterSpacing: 0.5
                        }}
                    />
                    {hasControl && (
                        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, minWidth: 200 }}>
                            Timeout automatique dans 2 minutes d'inactivité
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ mb: 4 }} />

                <Box display="flex" gap={3} flexWrap="wrap">
                    {!hasControl ? (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onRequestControl}
                            startIcon={<Gamepad />}
                            sx={{
                                flex: 1,
                                py: 1.6,
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #38bdf8 0%, #2ee7e7 100%)',
                                boxShadow: '0 6px 20px rgba(56,189,248,0.18)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)'
                                },
                                fontWeight: 700,
                                fontSize: 16,
                                textTransform: 'none'
                            }}
                        >
                            Demander le contrôle
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onReleaseControl}
                            startIcon={<LockOpen />}
                            sx={{
                                flex: 1,
                                py: 1.6,
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #f44336 0%, #ff5722 100%)',
                                boxShadow: '0 6px 20px rgba(244,67,54,0.14)',
                                '&:hover': {
                                    background: 'linear-gradient(90deg, #d32f2f 0%, #e64a19 100%)'
                                },
                                fontWeight: 700,
                                fontSize: 16,
                                textTransform: 'none'
                            }}
                        >
                            Libérer le contrôle
                        </Button>
                    )}

                    <Tooltip title="Paramètres avancés">
                        <IconButton
                            color="primary"
                            size="large"
                            sx={{
                                border: '2px solid',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                borderRadius: 3,
                                '&:hover': {
                                    background: 'primary.main',
                                    color: 'white'
                                },
                                transition: 'all 0.3s cubic-bezier(.4,0,.2,1)'
                            }}
                        >
                            <Settings fontSize="large" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ControlPanel;
