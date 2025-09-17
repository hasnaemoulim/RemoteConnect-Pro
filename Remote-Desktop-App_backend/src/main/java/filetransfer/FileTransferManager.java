package main.java.filetransfer;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class FileTransferManager {
    private static final String UPLOAD_DIR = "uploads/";
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max
    private static final int CHUNK_SIZE = 32768; // 32KB chunks

    private Map<String, FileTransferSession> activeSessions = new ConcurrentHashMap<>();

    public FileTransferManager() {
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
            System.out.println("📁 Dossier uploads créé: " + new File(UPLOAD_DIR).getAbsolutePath());
        } catch (IOException e) {
            System.err.println("Erreur création dossier uploads: " + e.getMessage());
        }
    }

    public String startFileUpload(String clientId, String fileName, long fileSize, String fileType) {
        System.out.println("📤 Début upload - Client: " + clientId + ", Fichier: " + fileName + ", Taille: " + fileSize + " bytes");

        if (fileSize > MAX_FILE_SIZE) {
            System.err.println("❌ Fichier trop volumineux: " + fileSize + " > " + MAX_FILE_SIZE);
            return null;
        }

        if (fileSize <= 0) {
            System.err.println("❌ Taille de fichier invalide: " + fileSize);
            return null;
        }

        String sessionId = UUID.randomUUID().toString().substring(0, 8);
        String sanitizedFileName = sanitizeFileName(fileName);
        String filePath = UPLOAD_DIR + sessionId + "_" + sanitizedFileName;

        // ✅ CORRECTION : Créer le fichier immédiatement avec la bonne taille
        try {
            File file = new File(filePath);
            if (file.exists()) {
                file.delete();
            }

            // Pré-allouer le fichier avec la taille exacte
            RandomAccessFile raf = new RandomAccessFile(filePath, "rw");
            raf.setLength(fileSize);
            raf.close();

            System.out.println("📁 Fichier pré-alloué: " + filePath + " (" + fileSize + " bytes)");
        } catch (IOException e) {
            System.err.println("❌ Erreur pré-allocation fichier: " + e.getMessage());
            return null;
        }

        FileTransferSession session = new FileTransferSession(
                sessionId, clientId, filePath, fileSize, fileType
        );

        activeSessions.put(sessionId, session);
        System.out.println("✅ Session upload créée: " + sessionId + " pour " + fileName + " (" + formatFileSize(fileSize) + ")");
        return sessionId;
    }

    public boolean receiveFileChunk(String sessionId, int chunkIndex, byte[] data) {
        FileTransferSession session = activeSessions.get(sessionId);
        if (session == null) {
            System.err.println("❌ Session introuvable: " + sessionId);
            return false;
        }

        try {
            System.out.println("📦 Réception chunk " + chunkIndex + " pour session " + sessionId + " (" + data.length + " bytes)");
            session.writeChunk(chunkIndex, data);

            if (session.isComplete()) {
                System.out.println("✅ Upload terminé: " + session.getFileName());

                // Vérifier la taille finale du fichier
                File file = new File(session.getFilePath());
                System.out.println("📊 Taille finale du fichier: " + file.length() + " bytes (attendu: " + session.getFileSize() + ")");

                session.close();
                activeSessions.remove(sessionId);
            } else {
                double progress = session.getProgress();
                System.out.println("📊 Progrès: " + String.format("%.1f", progress) + "% (" + session.getReceivedChunks() + "/" + session.getTotalChunks() + ")");
            }

            return true;
        } catch (IOException e) {
            System.err.println("❌ Erreur écriture chunk: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    public FileTransferSession startFileDownload(String clientId, String fileName) {
        String filePath = findFile(fileName);
        if (filePath == null) {
            System.err.println("❌ Fichier introuvable pour download: " + fileName);
            return null;
        }

        try {
            File file = new File(filePath);
            String sessionId = UUID.randomUUID().toString().substring(0, 8);

            System.out.println("📥 Début download - Fichier: " + fileName + ", Taille: " + file.length() + " bytes");

            FileTransferSession session = new FileTransferSession(
                    sessionId, clientId, filePath, file.length(), getFileType(fileName)
            );

            activeSessions.put(sessionId, session);
            return session;
        } catch (Exception e) {
            System.err.println("❌ Erreur début download: " + e.getMessage());
            return null;
        }
    }

    public byte[] readFileChunk(String sessionId, int chunkIndex) {
        FileTransferSession session = activeSessions.get(sessionId);
        if (session == null) return null;

        try {
            byte[] chunk = session.readChunk(chunkIndex);
            if (chunk != null) {
                System.out.println("📤 Envoi chunk " + chunkIndex + " (" + chunk.length + " bytes)");
            }
            return chunk;
        } catch (IOException e) {
            System.err.println("❌ Erreur lecture chunk: " + e.getMessage());
            return null;
        }
    }

    public List<FileInfo> getAvailableFiles() {
        List<FileInfo> files = new ArrayList<>();

        try {
            Files.list(Paths.get(UPLOAD_DIR))
                    .filter(Files::isRegularFile)
                    .forEach(path -> {
                        File file = path.toFile();
                        String displayName = file.getName();

                        // Enlever le préfixe sessionId_ si présent
                        if (displayName.length() > 9 && displayName.charAt(8) == '_') {
                            displayName = displayName.substring(9);
                        }

                        // ✅ CORRECTION : Vérifier que le fichier n'est pas vide
                        if (file.length() > 0) {
                            files.add(new FileInfo(
                                    displayName,
                                    file.length(),
                                    getFileType(displayName),
                                    file.lastModified()
                            ));
                            System.out.println("📋 Fichier listé: " + displayName + " (" + file.length() + " bytes)");
                        } else {
                            System.out.println("⚠️ Fichier vide ignoré: " + displayName);
                        }
                    });
        } catch (IOException e) {
            System.err.println("❌ Erreur listage fichiers: " + e.getMessage());
        }

        System.out.println("📋 Total fichiers disponibles: " + files.size());
        return files;
    }

    public FileTransferSession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }

    public void clearAllFiles() {
        try {
            // Fermer toutes les sessions actives
            for (FileTransferSession session : activeSessions.values()) {
                session.close();
            }
            activeSessions.clear();

            // Supprimer tous les fichiers
            Files.list(Paths.get(UPLOAD_DIR))
                    .filter(Files::isRegularFile)
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                            System.out.println("🗑️ Fichier supprimé: " + path.getFileName());
                        } catch (IOException e) {
                            System.err.println("❌ Erreur suppression fichier: " + e.getMessage());
                        }
                    });
        } catch (IOException e) {
            System.err.println("❌ Erreur listage fichiers pour suppression: " + e.getMessage());
        }
    }

    public void removeSession(String sessionId) {
        FileTransferSession session = activeSessions.remove(sessionId);
        if (session != null) {
            session.close();
            System.out.println("🧹 Session supprimée: " + sessionId);
        }
    }

    private String sanitizeFileName(String fileName) {
        return fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String findFile(String fileName) {
        try {
            return Files.list(Paths.get(UPLOAD_DIR))
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        String fullName = path.getFileName().toString();
                        return fullName.equals(fileName) ||
                                (fullName.length() > 9 && fullName.substring(9).equals(fileName));
                    })
                    .findFirst()
                    .map(Path::toString)
                    .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }

    private String getFileType(String fileName) {
        if (!fileName.contains(".")) return "file";

        String extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        switch (extension) {
            case "jpg": case "jpeg": case "png": case "gif": case "bmp": case "webp":
                return "image";
            case "mp4": case "avi": case "mov": case "wmv": case "flv": case "mkv":
                return "video";
            case "pdf":
                return "document";
            case "txt": case "doc": case "docx": case "rtf": case "odt":
                return "text";
            case "mp3": case "wav": case "flac": case "aac": case "ogg":
                return "audio";
            case "zip": case "rar": case "7z": case "tar": case "gz":
                return "archive";
            case "exe": case "msi": case "deb": case "rpm":
                return "executable";
            default:
                return "file";
        }
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}