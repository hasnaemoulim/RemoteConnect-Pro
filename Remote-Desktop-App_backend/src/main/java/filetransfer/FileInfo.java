package main.java.filetransfer;

import java.text.SimpleDateFormat;
import java.util.Date;

public class FileInfo {
    private String name;
    private long size;
    private String type;
    private long lastModified;

    public FileInfo(String name, long size, String type, long lastModified) {
        this.name = name;
        this.size = size;
        this.type = type;
        this.lastModified = lastModified;
    }

    public String toJson() {
        return String.format(
                "{\"name\":\"%s\",\"size\":%d,\"type\":\"%s\",\"lastModified\":%d,\"formattedSize\":\"%s\",\"formattedDate\":\"%s\"}",
                name.replace("\"", "\\\""), size, type, lastModified,
                formatFileSize(size), formatDate(lastModified)
        );
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }

    private String formatDate(long timestamp) {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        return sdf.format(new Date(timestamp));
    }

    // Getters
    public String getName() { return name; }
    public long getSize() { return size; }
    public String getType() { return type; }
    public long getLastModified() { return lastModified; }
}