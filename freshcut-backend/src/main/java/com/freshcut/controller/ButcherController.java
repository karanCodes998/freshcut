package com.freshcut.controller;

import com.freshcut.dto.MeatItemDTO;
import com.freshcut.dto.OrderDTO;
import com.freshcut.model.ButcherShop;
import com.freshcut.model.MeatItem;
import com.freshcut.model.OrderStatus;
import com.freshcut.model.User;
import com.freshcut.service.ButcherService;
import com.freshcut.service.ImageUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/butcher")
@RequiredArgsConstructor
public class ButcherController {

    private final ButcherService butcherService;
    private final ImageUploadService imageUploadService;

    @GetMapping("/shop")
    public ResponseEntity<?> getShop(@AuthenticationPrincipal User user) {
        ButcherShop shop = butcherService.getShopByUser(user);
        if (shop == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(shop);
    }

    @PostMapping("/shop")
    public ResponseEntity<ButcherShop> createShop(
            @AuthenticationPrincipal User user,
            @RequestBody ButcherShop shop) {
        return ResponseEntity.ok(butcherService.createShop(user, shop));
    }

    @PutMapping("/shop")
    public ResponseEntity<ButcherShop> updateShop(
            @AuthenticationPrincipal User user,
            @RequestBody ButcherShop shop) {
        return ResponseEntity.ok(butcherService.updateShop(user, shop));
    }

    @PutMapping("/shop/delivery-fee")
    public ResponseEntity<ButcherShop> updateDeliveryFee(
            @AuthenticationPrincipal User user,
            @RequestBody java.util.Map<String, Object> body) {
        return ResponseEntity.ok(butcherService.updateDeliverySettings(user, body));
    }

    @GetMapping("/items")
    public ResponseEntity<List<MeatItem>> getItems(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(butcherService.getItems(user));
    }

    @PostMapping("/items")
    public ResponseEntity<MeatItem> addItem(
            @AuthenticationPrincipal User user,
            @RequestBody MeatItemDTO itemDTO) {
        return ResponseEntity.ok(butcherService.addItem(user, itemDTO));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<MeatItem> updateItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody MeatItemDTO itemDTO) {
        return ResponseEntity.ok(butcherService.updateItem(user, id, itemDTO));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        butcherService.deleteItem(user, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/items/{id}/image")
    public ResponseEntity<MeatItem> uploadImage(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        String imageUrl = imageUploadService.uploadImage(file);
        return ResponseEntity.ok(butcherService.updateItemImage(user, id, imageUrl));
    }

    @PutMapping("/items/{id}/toggle")
    public ResponseEntity<MeatItem> toggleAvailability(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(butcherService.toggleAvailability(user, id));
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDTO>> getOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(butcherService.getOrders(user));
    }

    @PutMapping("/orders/{id}/accept")
    public ResponseEntity<Void> acceptOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        butcherService.updateOrderStatus(user, id, OrderStatus.ACCEPTED);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/orders/{id}/reject")
    public ResponseEntity<Void> rejectOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        butcherService.updateOrderStatus(user, id, OrderStatus.CANCELLED);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/orders/{id}/prepare")
    public ResponseEntity<Void> prepareOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        butcherService.updateOrderStatus(user, id, OrderStatus.PREPARING);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/orders/{id}/ready")
    public ResponseEntity<Void> readyOrder(@AuthenticationPrincipal User user, @PathVariable Long id) {
        butcherService.updateOrderStatus(user, id, OrderStatus.READY);
        return ResponseEntity.ok().build();
    }
}
