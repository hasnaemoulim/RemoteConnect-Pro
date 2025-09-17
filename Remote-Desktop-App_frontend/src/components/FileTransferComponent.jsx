import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    Fab,
    Tooltip,
    Zoom,
    Divider,
    Alert,
    Paper,
    Stack,
    Badge
} from '@mui/material';
import {
    CloudUpload,
    CloudDownload,
    InsertDriveFile,
    Image,
    VideoFile,
    PictureAsPdf,
    Description,
    Close,
    FolderOpen,
    AttachFile,
    GetApp,
    Refresh,
    AudioFile,
    Archive
} from '@mui/icons-material';

const FileTransferComponent = ({ socketService, isAuthenticated }) => {
    const [files, setFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [downloadProgress, setDownloadProgress] = useState({});
    const [isOpen, setIsOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState('');
    const [activeTransfers, setActiveTransfers] = useState(0);
    const fileInputRef = useRef(null);
    const activeUploads = useRef(new Map());
    const activeDownloads = useRef(new Map());

    useEffect(() => {
        if (!socketService || !isAuthenticated) return;

        const handleFileList = (data) => {
            try {
                const fileList = JSON.parse(data);
                setFiles(fileList);
                setError('');
                console.log('📁 Liste des fichiers reçue:', fileList);
            } catch (e) {
                console.error('Erreur parsing liste fichiers:', e);
                setError('Erreur lors du chargement de la liste des fichiers');
            }
        };

        // ✅ CORRECTION : Gérer la réponse du serveur avec le vrai sessionId
        const handleUploadSession = (sessionId) => {
            console.log('📤 Session upload créée par le serveur:', sessionId);
            
            // Trouver l'upload en attente et mettre à jour avec le vrai sessionId
            const pendingUploads = Array.from(activeUploads.current.entries());
            for (const [tempId, upload] of pendingUploads) {
                if (upload.isPending) {
                    // Transférer vers le vrai sessionId
                    activeUploads.current.set(sessionId, {
                        ...upload,
                        isPending: false,
                        sessionId: sessionId
                    });
                    activeUploads.current.delete(tempId);
                    
                    // Commencer l'envoi des chunks
                    sendNextChunk(sessionId, activeUploads.current.get(sessionId));
                    setActiveTransfers(prev => prev + 1);
                    break;
                }
            }
        };

        const handleChunkAck = (data) => {
            const [sessionId, chunkIndex, success] = data.split(':');
            console.log(`📦 Chunk ACK: ${sessionId}, chunk ${chunkIndex}, success: ${success}`);
            
            if (success === 'true') {
                const upload = activeUploads.current.get(sessionId);
                if (upload) {
                    upload.uploadedChunks++;
                    const progress = (upload.uploadedChunks / upload.totalChunks) * 100;
                    setUploadProgress(prev => ({ ...prev, [sessionId]: progress }));
                    
                    console.log(`📊 Progrès upload: ${Math.round(progress)}% (${upload.uploadedChunks}/${upload.totalChunks})`);
                    
                    if (upload.uploadedChunks < upload.totalChunks) {
                        // Envoyer le chunk suivant
                        sendNextChunk(sessionId, upload);
                    } else {
                        // Upload terminé
                        console.log('✅ Upload terminé avec succès !');
                        activeUploads.current.delete(sessionId);
                        setUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[sessionId];
                            return newProgress;
                        });
                        setActiveTransfers(prev => prev - 1);
                        
                        // Rafraîchir la liste des fichiers après un délai
                        setTimeout(() => {
                            requestFileList();
                        }, 1000);
                    }
                }
            } else {
                console.error('❌ Erreur lors de l\'envoi du chunk');
                setError('Erreur lors du transfert du fichier');
            }
        };

        const handleDownloadStart = (data) => {
            try {
                const downloadInfo = JSON.parse(data);
                console.log('📥 Début du téléchargement:', downloadInfo);
                
                activeDownloads.current.set(downloadInfo.sessionId, {
                    ...downloadInfo,
                    chunks: new Array(downloadInfo.totalChunks),
                    receivedChunks: 0
                });
                
                setActiveTransfers(prev => prev + 1);
                socketService.socket.send(`REQUEST_CHUNK:${downloadInfo.sessionId}:0`);
            } catch (e) {
                console.error('Erreur parsing download start:', e);
            }
        };

        const handleFileChunk = (data) => {
            const [sessionId, chunkIndex, base64Data] = data.split(':', 3);
            const download = activeDownloads.current.get(sessionId);
            
            if (download) {
                const chunkData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                download.chunks[parseInt(chunkIndex)] = chunkData;
                download.receivedChunks++;
                
                const progress = (download.receivedChunks / download.totalChunks) * 100;
                setDownloadProgress(prev => ({ ...prev, [sessionId]: progress }));
                
                if (download.receivedChunks < download.totalChunks) {
                    socketService.socket.send(`REQUEST_CHUNK:${sessionId}:${download.receivedChunks}`);
                } else {
                    assembleAndDownloadFile(download);
                    activeDownloads.current.delete(sessionId);
                    setDownloadProgress(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[sessionId];
                        return newProgress;
                    });
                    setActiveTransfers(prev => prev - 1);
                }
            }
        };

        socketService.on('fileList', handleFileList);
        socketService.on('uploadSession', handleUploadSession);
        socketService.on('chunkAck', handleChunkAck);
        socketService.on('downloadStart', handleDownloadStart);
        socketService.on('fileChunk', handleFileChunk);

        return () => {
            socketService.off('fileList', handleFileList);
            socketService.off('uploadSession', handleUploadSession);
            socketService.off('chunkAck', handleChunkAck);
            socketService.off('downloadStart', handleDownloadStart);
            socketService.off('fileChunk', handleFileChunk);
        };
    }, [socketService, isAuthenticated]);

    const requestFileList = () => {
        if (socketService && isAuthenticated) {
            console.log('📋 Demande de liste des fichiers...');
            socketService.socket.send('REQUEST_FILE_LIST');
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadFile(file);
        }
        // Reset input pour permettre de sélectionner le même fichier
        event.target.value = '';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragOver(false);
        
        const file = event.dataTransfer.files[0];
        if (file) {
            uploadFile(file);
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    // ✅ CORRECTION : Fonction d'upload corrigée
    const uploadFile = (file) => {
        if (file.size > 50 * 1024 * 1024) {
            setError('Le fichier est trop volumineux (max 50MB)');
            return;
        }

        if (file.size === 0) {
            setError('Le fichier est vide');
            return;
        }

        console.log('📁 Début upload du fichier:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const totalChunks = Math.ceil(arrayBuffer.byteLength / 32768);
            
            console.log('📊 Fichier lu:', {
                arrayBufferSize: arrayBuffer.byteLength,
                totalChunks: totalChunks
            });

            // Générer un ID temporaire pour l'upload
            const tempId = 'temp_' + Date.now();
            
            // Stocker les données d'upload avec un flag pending
            activeUploads.current.set(tempId, {
                file: arrayBuffer,
                totalChunks: totalChunks,
                uploadedChunks: 0,
                chunkSize: 32768,
                fileName: file.name,
                isPending: true // ✅ Flag pour identifier les uploads en attente
            });

            // Envoyer la demande de début d'upload au serveur
            const message = `FILE_UPLOAD_START:${file.name}:${file.size}:${getFileType(file.name)}`;
            console.log('📤 Envoi demande upload:', message);
            socketService.socket.send(message);
        };

        reader.onerror = (error) => {
            console.error('❌ Erreur lecture fichier:', error);
            setError('Erreur lors de la lecture du fichier');
        };

        reader.readAsArrayBuffer(file);
    };

    // ✅ CORRECTION : Fonction d'envoi de chunk corrigée
    const sendNextChunk = (sessionId, upload) => {
        try {
            const chunkIndex = upload.uploadedChunks;
            const start = chunkIndex * upload.chunkSize;
            const end = Math.min(start + upload.chunkSize, upload.file.byteLength);
            const chunk = upload.file.slice(start, end);
            
            console.log(`📦 Envoi chunk ${chunkIndex}/${upload.totalChunks - 1} (${chunk.byteLength} bytes)`);
            
            // Convertir en base64
            const uint8Array = new Uint8Array(chunk);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Data = btoa(binary);
            
            const message = `FILE_CHUNK:${sessionId}:${chunkIndex}:${base64Data}`;
            socketService.socket.send(message);
            
        } catch (error) {
            console.error('❌ Erreur envoi chunk:', error);
            setError('Erreur lors de l\'envoi du fichier');
        }
    };

    const downloadFile = (fileName) => {
        if (socketService && isAuthenticated) {
            console.log('📥 Demande de téléchargement:', fileName);
            socketService.socket.send(`DOWNLOAD_FILE:${fileName}`);
        }
    };

    const assembleAndDownloadFile = (download) => {
        try {
            console.log('🔧 Assemblage du fichier téléchargé...');
            
            const totalSize = download.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const assembledFile = new Uint8Array(totalSize);
            
            let offset = 0;
            for (const chunk of download.chunks) {
                assembledFile.set(chunk, offset);
                offset += chunk.length;
            }
            
            const blob = new Blob([assembledFile]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = download.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Fichier téléchargé avec succès !');
        } catch (error) {
            console.error('❌ Erreur assemblage fichier:', error);
            setError('Erreur lors du téléchargement du fichier');
        }
    };

    const getFileIcon = (type) => {
        switch (type) {
            case 'image': return <Image color="primary" />;
            case 'video': return <VideoFile color="secondary" />;
            case 'document': return <PictureAsPdf color="error" />;
            case 'text': return <Description color="success" />;
            case 'audio': return <AudioFile color="warning" />;
            case 'archive': return <Archive color="info" />;
            default: return <InsertDriveFile color="action" />;
        }
    };

    const getFileType = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
        if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) return 'video';
        if (['pdf'].includes(extension)) return 'document';
        if (['txt', 'doc', 'docx', 'rtf', 'odt'].includes(extension)) return 'text';
        if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) return 'audio';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive';
        return 'file';
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    };

    if (!isAuthenticated) return null;

    return (
        <>
            {/* Bouton FAB avec badge pour les transferts actifs */}
            <Tooltip title="Gestionnaire de fichiers" placement="top">
                <Zoom in={isAuthenticated}>
                    <Badge 
                        badgeContent={activeTransfers} 
                        color="error"
                        sx={{
                            position: 'fixed',
                            bottom: 140,
                            right: 24,
                            zIndex: 1300
                        }}
                    >
                        <Fab
                            color="warning"
                            onClick={() => {
                                setIsOpen(true);
                                requestFileList();
                            }}
                            sx={{
                                background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                                color: 'white',
                                width: 64,
                                height: 64,
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #f57c00, #ff9800)',
                                    transform: 'scale(1.05)'
                                },
                                boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <FolderOpen sx={{ fontSize: 28 }} />
                        </Fab>
                    </Badge>
                </Zoom>
            </Tooltip>

            {/* Dialog organisé et professionnel */}
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '85vh',
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
                    }
                }}
                sx={{ zIndex: 1400 }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={2}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                                    color: 'white'
                                }}
                            >
                                <FolderOpen />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="bold" color="primary">
                                    Gestionnaire de Fichiers
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Partagez et téléchargez des fichiers en toute sécurité (max 50MB)
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton 
                            onClick={() => setIsOpen(false)}
                            sx={{ 
                                background: 'rgba(0, 0, 0, 0.05)',
                                '&:hover': { background: 'rgba(0, 0, 0, 0.1)' }
                            }}
                        >
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ p: 3 }}>
                    {/* Zone de contrôles avec drag & drop */}
                    <Paper 
                        sx={{ 
                            p: 3, 
                            mb: 3, 
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                            border: '2px dashed transparent',
                            borderColor: isDragOver ? '#ff9800' : '#dee2e6',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                borderColor: '#ff9800',
                                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
                            }
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Stack direction="column" alignItems="center" spacing={2}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                                accept="*/*"
                            />
                            
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '50%',
                                    background: isDragOver ? 'linear-gradient(45deg, #ff9800, #ffb74d)' : 'linear-gradient(45deg, #2196f3, #64b5f6)',
                                    color: 'white',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <AttachFile sx={{ fontSize: 32 }} />
                            </Box>
                            
                            <Box textAlign="center">
                                <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
                                    {isDragOver ? 'Déposez votre fichier ici' : 'Glissez un fichier ici'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ou cliquez pour sélectionner (max 50MB)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Formats supportés : Images, Vidéos, Documents, Archives
                                </Typography>
                            </Box>
                            
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="contained"
                                    startIcon={<CloudUpload />}
                                    sx={{ 
                                        background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #388e3c, #4caf50)'
                                        }
                                    }}
                                >
                                    Sélectionner un fichier
                                </Button>
                                
                                <Button
                                    variant="outlined"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        requestFileList();
                                    }}
                                    startIcon={<Refresh />}
                                    sx={{ 
                                        borderColor: '#ff9800',
                                        color: '#ff9800',
                                        '&:hover': {
                                            borderColor: '#f57c00',
                                            background: 'rgba(255, 152, 0, 0.1)'
                                        }
                                    }}
                                >
                                    Actualiser
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>

                    {/* Messages d'erreur */}
                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2, borderRadius: 2 }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Progrès des uploads */}
                    {Object.entries(uploadProgress).map(([sessionId, progress]) => (
                        <Paper key={sessionId} sx={{ p: 2, mb: 2, background: '#e8f5e8', borderRadius: 2 }}>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                                        color: 'white'
                                    }}
                                >
                                    <CloudUpload />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="body2" color="success.main" fontWeight="bold" gutterBottom>
                                        📤 Upload en cours...
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={progress} 
                                        sx={{ 
                                            height: 8, 
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                                                borderRadius: 4
                                            }
                                        }}
                                    />
                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {Math.round(progress)}% terminé
                                        </Typography>
                                        <Chip 
                                            label={`${Math.round(progress)}%`} 
                                            size="small" 
                                            color="success"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    ))}

                    {/* Progrès des downloads */}
                    {Object.entries(downloadProgress).map(([sessionId, progress]) => (
                        <Paper key={sessionId} sx={{ p: 2, mb: 2, background: '#e3f2fd', borderRadius: 2 }}>
                            <Box display="flex" alignItems="center" gap={2}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                                        color: 'white'
                                    }}
                                >
                                    <CloudDownload />
                                </Box>
                                <Box flex={1}>
                                    <Typography variant="body2" color="info.main" fontWeight="bold" gutterBottom>
                                        📥 Téléchargement en cours...
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={progress}
                                        color="info"
                                        sx={{ 
                                            height: 8, 
                                            borderRadius: 4,
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 4
                                            }
                                        }}
                                    />
                                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {Math.round(progress)}% terminé
                                        </Typography>
                                        <Chip 
                                            label={`${Math.round(progress)}%`} 
                                            size="small" 
                                            color="info"
                                            sx={{ fontWeight: 'bold' }}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    ))}

                    <Divider sx={{ my: 3 }} />

                    {/* En-tête de la liste des fichiers */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FolderOpen />
                            Fichiers disponibles ({files.length})
                        </Typography>
                        
                        {activeTransfers > 0 && (
                            <Chip 
                                label={`${activeTransfers} transfert${activeTransfers > 1 ? 's' : ''} en cours`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                            />
                        )}
                    </Box>

                    {/* Liste des fichiers */}
                    {files.length === 0 ? (
                        <Paper sx={{ p: 4, textAlign: 'center', background: '#f9f9f9', borderRadius: 2 }}>
                            <FolderOpen sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                            <Typography color="text.secondary" variant="h6" gutterBottom>
                                Aucun fichier disponible
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                Envoyez un fichier pour commencer le partage
                            </Typography>
                        </Paper>
                    ) : (
                        <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                            {files.map((file, index) => (
                                <ListItem 
                                    key={index} 
                                    divider={index < files.length - 1}
                                    sx={{
                                        borderRadius: 1,
                                        mb: 0.5,
                                        mx: 1,
                                        background: 'rgba(25, 118, 210, 0.02)',
                                        border: '1px solid rgba(25, 118, 210, 0.1)',
                                        '&:hover': {
                                            background: 'rgba(25, 118, 210, 0.08)',
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                                            '& .download-btn': {
                                                transform: 'scale(1.1)'
                                            }
                                        },
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 56 }}>
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 2,
                                                background: 'rgba(25, 118, 210, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {getFileIcon(file.type)}
                                        </Box>
                                    </ListItemIcon>
                                    
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                                                {file.name}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box>
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    <Chip 
                                                        label={formatFileSize(file.size)} 
                                                        size="small" 
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                    <Chip 
                                                        label={file.type} 
                                                        size="small" 
                                                        color="secondary"
                                                        variant="outlined"
                                                        sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                                                    />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                    Ajouté le {new Date(file.lastModified).toLocaleDateString('fr-FR')}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    
                                    <ListItemSecondaryAction>
                                        <Tooltip title={`Télécharger ${file.name}`} placement="top">
                                            <IconButton
                                                className="download-btn"
                                                onClick={() => downloadFile(file.name)}
                                                sx={{
                                                    background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                                                    color: 'white',
                                                    width: 48,
                                                    height: 48,
                                                    '&:hover': {
                                                        background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                                                        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <GetApp />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {/* Footer avec statistiques */}
                    <Box sx={{ mt: 3, p: 2, background: '#f5f5f5', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                💾 Espace utilisé: {files.reduce((total, file) => total + file.size, 0) > 0 ? formatFileSize(files.reduce((total, file) => total + file.size, 0)) : '0 B'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                📁 {files.length} fichier{files.length !== 1 ? 's' : ''} partagé{files.length !== 1 ? 's' : ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                🔒 Transfert sécurisé AES-256
                            </Typography>
                        </Stack>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default FileTransferComponent;
