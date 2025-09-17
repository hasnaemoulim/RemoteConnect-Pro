package main.java.filetransfer;

import java.io.*;
import java.util.concurrent.ConcurrentHashMap;

public class FileTransferSession {
    private String sessionId;
    private String clientId;
    private String filePath;
    private long fileSize;
    private String fileType;
    private RandomAccessFile file;
    private ConcurrentHashMap<Integer, Boolean> receivedChunks;
    private int totalChunks;
    private static final int CHUNK_SIZE = 32768;
    private boolean isClosed = false;

    public FileTransferSession(String sessionId, String clientId, String filePath,
                               long fileSize, String fileType) {
        this.sessionId = sessionId;
        this.clientId = clientId;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.totalChunks = (int) Math.ceil((double) fileSize / CHUNK_SIZE);
        this.receivedChunks = new ConcurrentHashMap<>();

        try {
            this.file = new RandomAccessFile(filePath, "rw");
            System.out.println("📁 Session créée: " + sessionId + " - " + totalChunks + " chunks attendus");
        } catch (IOException e) {
            System.err.println("❌ Erreur ouverture fichier: " + e.getMessage());
        }
    }

    public synchronized void writeChunk(int chunkIndex, byte[] data) throws IOException {
        if (file != null && !isClosed) {
            long offset = (long) chunkIndex * CHUNK_SIZE;
            file.seek(offset);
            file.write(data);
            file.getFD().sync(); // ✅ CORRECTION : Forcer l'écriture sur disque
            receivedChunks.put(chunkIndex, true);

            System.out.println("✍️ Chunk " + chunkIndex + " écrit à l'offset " + offset + " (" + data.length + " bytes)");
        }
    }

    public synchronized byte[] readChunk(int chunkIndex) throws IOException {
        if (file != null && !isClosed) {
            long offset = (long) chunkIndex * CHUNK_SIZE;
            file.seek(offset);

            int bytesToRead = (int) Math.min(CHUNK_SIZE, fileSize - offset);
            byte[] buffer = new byte[bytesToRead];
            int bytesRead = file.read(buffer);

            if (bytesRead != bytesToRead) {
                System.err.println("⚠️ Lecture incomplète: " + bytesRead + "/" + bytesToRead + " bytes");
            }

            return buffer;
        }
        return null;
    }

    public boolean isComplete() {
        boolean complete = receivedChunks.size() == totalChunks;
        if (complete) {
            System.out.println("✅ Tous les chunks reçus: " + receivedChunks.size() + "/" + totalChunks);
        }
        return complete;
    }

    public double getProgress() {
        return totalChunks > 0 ? (double) receivedChunks.size() / totalChunks * 100 : 0;
    }

    public synchronized void close() {
        if (!isClosed) {
            try {
                if (file != null) {
                    file.getFD().sync(); // ✅ CORRECTION : Synchroniser avant fermeture
                    file.close();
                    System.out.println("🔒 Fichier fermé: " + filePath);
                }
            } catch (IOException e) {
                System.err.println("❌ Erreur fermeture fichier: " + e.getMessage());
            } finally {
                isClosed = true;
            }
        }
    }

    // Getters
    public String getSessionId() { return sessionId; }
    public String getClientId() { return clientId; }
    public String getFileName() {
        String name = new File(filePath).getName();
        if (name.length() > 9 && name.charAt(8) == '_') {
            return name.substring(9);
        }
        return name;
    }
    public long getFileSize() { return fileSize; }
    public String getFileType() { return fileType; }
    public int getTotalChunks() { return totalChunks; }
    public int getReceivedChunks() { return receivedChunks.size(); }
    public boolean isClosed() { return isClosed; }
    public String getFilePath() { return filePath; }
}