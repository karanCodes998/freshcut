package com.freshcut.controller;

import com.freshcut.dto.OrderDTO;
import com.freshcut.model.User;
import com.freshcut.service.RiderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rider")
@RequiredArgsConstructor
public class RiderController {

    private final RiderService riderService;

    @GetMapping("/profile")
    public ResponseEntity<java.util.Map<String, Object>> getProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(riderService.getProfile(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<Void> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody java.util.Map<String, String> data) {
        riderService.updateProfile(user, data);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/status/online")
    public ResponseEntity<Void> goOnline(@AuthenticationPrincipal User user) {
        riderService.setStatus(user, true);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/status/offline")
    public ResponseEntity<Void> goOffline(@AuthenticationPrincipal User user) {
        riderService.setStatus(user, false);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/orders/available")
    public ResponseEntity<List<OrderDTO>> getAvailableOrders() {
        return ResponseEntity.ok(riderService.getAvailableOrders());
    }

    @GetMapping("/orders/active")
    public ResponseEntity<OrderDTO> getActiveDelivery(@AuthenticationPrincipal User user) {
        OrderDTO active = riderService.getActiveDelivery(user);
        return ResponseEntity.ok(active);
    }

    @PutMapping("/orders/{id}/accept")
    public ResponseEntity<Void> acceptOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        riderService.acceptOrder(user, id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/orders/{id}/pickup")
    public ResponseEntity<Void> pickupOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        riderService.pickupOrder(user, id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/orders/{id}/deliver")
    public ResponseEntity<Void> deliverOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        riderService.deliverOrder(user, id);
        return ResponseEntity.ok().build();
    }
}
