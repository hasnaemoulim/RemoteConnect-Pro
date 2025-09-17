package main.java.capture;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import java.util.concurrent.atomic.AtomicReference;

public class ScreenCapturer {
    private Robot robot;
    private Rectangle screenBounds;
    private ImageCompressor compressor;
    private AtomicReference<BufferedImage> lastCapture = new AtomicReference<>();
    private volatile boolean isCapturing = false;
    private byte[] lastImageData = null;
    private long lastCaptureTime = 0;
    private static final long MIN_CAPTURE_INTERVAL = 100; // OPTIMISÉ: 10 FPS
    private int changeDetectionSamples = 50; // Réduire les échantillons

    public ScreenCapturer() {
        try {
            this.robot = new Robot();
            this.robot.setAutoDelay(0);
            this.robot.setAutoWaitForIdle(false);
            this.screenBounds = new Rectangle(Toolkit.getDefaultToolkit().getScreenSize());
            this.compressor = new ImageCompressor();
            this.compressor.setCompressionQuality(0.60f); // RÉDUIT pour vitesse

            System.out.println("📹 ScreenCapturer ultra-rapide initialisé");
        } catch (AWTException e) {
            throw new RuntimeException("Impossible d'initialiser Robot", e);
        }
    }

    public synchronized byte[] captureScreen() throws IOException {
        long currentTime = System.currentTimeMillis();

        // Limitation stricte
        if (currentTime - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
            return lastImageData;
        }

        if (isCapturing) {
            return lastImageData;
        }

        isCapturing = true;
        try {
            BufferedImage screenshot = robot.createScreenCapture(screenBounds);
            BufferedImage optimized = optimizeImageFast(screenshot);

            byte[] compressedData = compressor.compressImage(optimized);

            // Détection de changements ultra-rapide
            if (hasQuickChange(compressedData)) {
                lastImageData = compressedData;
                lastCaptureTime = currentTime;
                return compressedData;
            } else {
                return lastImageData;
            }

        } finally {
            isCapturing = false;
        }
    }

    private boolean hasQuickChange(byte[] newData) {
        if (lastImageData == null) return true;

        // Comparaison ultra-rapide (seulement 10 échantillons)
        int step = Math.max(1, Math.min(newData.length, lastImageData.length) / 10);
        for (int i = 0; i < Math.min(newData.length, lastImageData.length); i += step) {
            if (newData[i] != lastImageData[i]) {
                return true;
            }
        }
        return false;
    }

    private BufferedImage optimizeImageFast(BufferedImage original) {
        // Résolution encore plus réduite pour vitesse maximale
        int maxWidth = 480;  // TRÈS RÉDUIT
        int maxHeight = 270; // TRÈS RÉDUIT

        double scaleX = (double) maxWidth / original.getWidth();
        double scaleY = (double) maxHeight / original.getHeight();
        double scale = Math.min(scaleX, scaleY);

        if (scale >= 1.0) {
            return original;
        }

        int newWidth = (int) (original.getWidth() * scale);
        int newHeight = (int) (original.getHeight() * scale);

        return resizeImageUltraFast(original, newWidth, newHeight);
    }

    private BufferedImage resizeImageUltraFast(BufferedImage original, int targetWidth, int targetHeight) {
        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resized.createGraphics();

        // Configuration pour vitesse maximale
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_SPEED);
        g2d.setRenderingHint(RenderingHints.KEY_COLOR_RENDERING, RenderingHints.VALUE_COLOR_RENDER_SPEED);
        g2d.setRenderingHint(RenderingHints.KEY_ALPHA_INTERPOLATION, RenderingHints.VALUE_ALPHA_INTERPOLATION_SPEED);
        g2d.setRenderingHint(RenderingHints.KEY_DITHERING, RenderingHints.VALUE_DITHER_DISABLE);

        g2d.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        g2d.dispose();

        return resized;
    }

    public void clearCache() {
        lastCapture.set(null);
        lastImageData = null;
    }

    public Dimension getScreenSize() {
        return new Dimension(screenBounds.width, screenBounds.height);
    }
}
