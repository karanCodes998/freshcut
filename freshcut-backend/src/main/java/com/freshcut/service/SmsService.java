package com.freshcut.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/**
 * SMS Notification Service using Fast2SMS (Indian provider)
 * Sign up free at: https://www.fast2sms.com
 * No setup needed from customer — works on any Indian mobile number.
 * Free tier: 200 SMS. Production: ~₹0.15/SMS.
 */
@Slf4j
@Service
public class SmsService {

    @Value("${sms.fast2sms.apikey:}")
    private String apiKey;

    @Value("${sms.admin.phone:}")
    private String adminPhone;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Send a plain SMS to any Indian number (no setup needed from recipient).
     * @param phone 10-digit Indian mobile number
     * @param message SMS text (up to 160 chars recommended)
     */
    public void sendSms(String phone, String message) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("📵 SMS not configured — set sms.fast2sms.apikey in application.properties");
            log.info("📱 [SMS SIMULATION] To: {} → {}", phone, message);
            return;
        }

        try {
            String normalizedPhone = normalizePhone(phone);
            String encodedMessage = URLEncoder.encode(message, StandardCharsets.UTF_8);

            String url = "https://www.fast2sms.com/dev/bulkV2"
                    + "?authorization=" + apiKey
                    + "&message=" + encodedMessage
                    + "&language=english"
                    + "&route=q"
                    + "&numbers=" + normalizedPhone;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("cache-control", "no-cache")
                    .GET()
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(res -> {
                        if (res.statusCode() == 200 && res.body().contains("\"return\":true")) {
                            log.info("✅ SMS sent to {}", normalizedPhone);
                        } else {
                            log.warn("⚠️ SMS failed for {}: {}", normalizedPhone, res.body());
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("❌ SMS error: {}", ex.getMessage());
                        return null;
                    });

        } catch (Exception e) {
            log.error("❌ SMS send error: {}", e.getMessage());
        }
    }

    public void sendAdminSms(String message) {
        if (adminPhone != null && !adminPhone.isBlank()) {
            sendSms(adminPhone, message);
        }
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        // Remove all non-digits
        phone = phone.replaceAll("\\D", "");
        // Remove country code if present (91XXXXXXXXXX → XXXXXXXXXX)
        if (phone.length() == 12 && phone.startsWith("91")) {
            phone = phone.substring(2);
        }
        return phone;
    }
}
