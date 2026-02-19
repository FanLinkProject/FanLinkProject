package org.example.backend.ticket.util;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Component
public class TicketQrGenerator {

    private static final int DEFAULT_SIZE = 256;

    public byte[] generateQrImage(String content) {
        return generateQrImage(content, DEFAULT_SIZE);
    }

    public byte[] generateQrImage(String content, int size) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = Map.of(EncodeHintType.CHARACTER_SET, "UTF-8");
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, size, size, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("QR 코드 생성 실패", e);
        }
    }

    public String generateQrImageBase64(String content) {
        byte[] imageBytes = generateQrImage(content);
        return Base64.getEncoder().encodeToString(imageBytes);
    }
}
