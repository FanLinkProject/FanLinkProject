package org.example.backend.ticket.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Base64;

/**
 * 티켓 QR JWT 서명용 RSA 키 쌍 생성
 * 실행: Run 'GenerateTicketKeys.main()' 또는 gradle run
 */
public class GenerateTicketKeys {

    public static void main(String[] args) throws NoSuchAlgorithmException, IOException {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        keyGen.initialize(2048);
        KeyPair keyPair = keyGen.generateKeyPair();

        PrivateKey privateKey = keyPair.getPrivate();
        PublicKey publicKey = keyPair.getPublic();

        String privatePem = "-----BEGIN PRIVATE KEY-----\n"
                + chunk(Base64.getEncoder().encodeToString(privateKey.getEncoded()), 64)
                + "\n-----END PRIVATE KEY-----";

        String publicPem = "-----BEGIN PUBLIC KEY-----\n"
                + chunk(Base64.getEncoder().encodeToString(publicKey.getEncoded()), 64)
                + "\n-----END PUBLIC KEY-----";

        Path dir = Path.of("ticket-keys");
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("private.pem"), privatePem);
        Files.writeString(dir.resolve("public.pem"), publicPem);

        System.out.println("키 생성 완료: ticket-keys/private.pem, ticket-keys/public.pem");
        System.out.println("배포 시 GitHub Secrets에 PEM 내용(TICKET_PRIVATE_KEY, TICKET_PUBLIC_KEY) 등록 후 env로 전달");
    }

    private static String chunk(String s, int size) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i += size) {
            sb.append(s, i, Math.min(i + size, s.length())).append("\n");
        }
        return sb.toString().trim();
    }
}
