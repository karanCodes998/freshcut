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

@Slf4j
@Service
public class WhatsAppService {

    @Value("${whatsapp.admin.phone:}")
    private String adminPhone;

    @Value("${whatsapp.admin.apikey:}")
    private String adminApiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Sends a WhatsApp message via CallMeBot API.
     * Free service — each recipient must activate it once by messaging CallMeBot.
     * How to activate: Save +34 644 59 21 99 as "CallMeBot" on WhatsApp and send:
     *   "I allow callmebot to send me messages"
     * You receive your personal API key back.
     */
    public void sendMessage(String phone, String apiKey, String message) {
        if (phone == null || phone.isBlank() || apiKey == null || apiKey.isBlank()) {
            log.warn("WhatsApp not configured for phone: {}", phone);
            return;
        }
        try {
            String encodedMsg = URLEncoder.encode(message, StandardCharsets.UTF_8);
            // Normalize phone — remove leading 0, add country code if needed
            String normalizedPhone = normalizePhone(phone);
            String url = String.format(
                "https://api.callmebot.com/whatsapp.php?phone=%s&text=%s&apikey=%s",
                normalizedPhone, encodedMsg, apiKey
            );
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();
            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(res -> {
                        if (res.statusCode() == 200) {
                            log.info("✅ WhatsApp sent to {}", normalizedPhone);
                        } else {
                            log.warn("⚠️ WhatsApp failed for {}: {}", normalizedPhone, res.body());
                        }
                    });
        } catch (Exception e) {
            log.error("❌ WhatsApp error: {}", e.getMessage());
        }
    }

    public void notifyAdmin(String message) {
        sendMessage(adminPhone, adminApiKey, message);
    }

    private String normalizePhone(String phone) {
        // Remove spaces and dashes
        phone = phone.replaceAll("[\\s\\-]", "");
        // If starts with 0, replace with India code +91
        if (phone.startsWith("0")) {
            phone = "91" + phone.substring(1);
        }
        // If starts with +, remove it
        if (phone.startsWith("+")) {
            phone = phone.substring(1);
        }
        return phone;
    }
}
