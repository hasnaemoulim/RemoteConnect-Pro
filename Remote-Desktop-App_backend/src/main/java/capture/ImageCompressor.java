package main.java.capture;


import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.util.Iterator;

public class ImageCompressor {
    private float compressionQuality = 0.7f;

    public byte[] compressImage(BufferedImage image) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        ImageWriter writer = writers.next();

        ImageOutputStream ios = ImageIO.createImageOutputStream(baos);
        writer.setOutput(ios);

        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(0.50f);

        writer.write(null, new javax.imageio.IIOImage(image, null, null), param);

        writer.dispose();
        ios.close();

        return baos.toByteArray();
    }

    public void setCompressionQuality(float quality) {
        this.compressionQuality = Math.max(0.0f, Math.min(1.0f, quality));
    }
}
