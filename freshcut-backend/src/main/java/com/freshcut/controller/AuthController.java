package com.freshcut.controller;

import com.freshcut.dto.AuthResponse;
import com.freshcut.dto.LoginRequest;
import com.freshcut.dto.RegisterRequest;
import com.freshcut.dto.ForgotPasswordRequest;
import com.freshcut.dto.ResetPasswordRequest;
import com.freshcut.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<java.util.Map<String, String>> requestPasswordReset(@Valid @RequestBody ForgotPasswordRequest request) {
        String otp = authService.requestPasswordReset(request);
        return ResponseEntity.ok(java.util.Map.of("otp", otp));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }
}
