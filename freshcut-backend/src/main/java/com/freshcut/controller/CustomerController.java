package com.freshcut.controller;

import com.freshcut.dto.MeatItemDTO;
import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.ShopDTO;
import com.freshcut.model.User;
import com.freshcut.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/shops")
    public ResponseEntity<List<ShopDTO>> getShops() {
        return ResponseEntity.ok(customerService.getActiveShops());
    }

    @GetMapping("/shops/{id}/menu")
    public ResponseEntity<List<MeatItemDTO>> getMenu(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getShopMenu(id));
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderDTO> placeOrder(
            @AuthenticationPrincipal User user,
            @RequestBody OrderDTO orderRequest) {
        return ResponseEntity.ok(customerService.placeOrder(user, orderRequest));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<OrderDTO> getOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(customerService.getOrder(user, id));
    }

    @GetMapping("/orders/history")
    public ResponseEntity<List<OrderDTO>> getOrderHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(customerService.getOrderHistory(user));
    }

    @PutMapping("/orders/{id}/cancel")
    public ResponseEntity<OrderDTO> cancelOrder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        return ResponseEntity.ok(customerService.cancelOrder(user, id));
    }
}
