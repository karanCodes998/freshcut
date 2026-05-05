package com.freshcut.service;

import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.OrderItemDTO;
import com.freshcut.dto.ShopDTO;
import com.freshcut.model.*;
import com.freshcut.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final OrderRepository orderRepository;
    private final ButcherShopRepository shopRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final MeatItemRepository meatItemRepository;
    private final RiderStatusRepository riderStatusRepository;
    private final SettlementRepository settlementRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    @CacheEvict(value = {"shops", "menus"}, allEntries = true)
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Clean up shops regardless of current role
        shopRepository.findByUser(user).ifPresent(shop -> deleteShop(shop.getId()));
        
        // Clean up orders regardless of current role
        List<Order> orders = orderRepository.findByCustomerOrderByCreatedAtDesc(user);
        orders.forEach(o -> deleteOrder(o.getId()));
        
        // Clean up deliveries regardless of current role
        List<Delivery> deliveries = deliveryRepository.findByRiderOrderByAcceptedAtDesc(user);
        for (Delivery d : deliveries) {
            d.setRider(null);
            deliveryRepository.save(d);
        }
        
        // Always attempt to clean up rider status, in case they were previously a rider
        riderStatusRepository.findByRider(user).ifPresent(riderStatusRepository::delete);
        
        userRepository.deleteById(userId);
    }

    public User updateUserRole(Long userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(Role.valueOf(newRole.toUpperCase()));
        return userRepository.save(user);
    }

    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAll().stream()
                .map(this::mapToOrderDTO)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getLiveOrders() {
        return orderRepository.findAll().stream()
                .filter(o -> o.getStatus() != OrderStatus.DELIVERED && o.getStatus() != OrderStatus.CANCELLED)
                .map(this::mapToOrderDTO)
                .collect(Collectors.toList());
    }

    public List<ShopDTO> getAllShops() {
        return shopRepository.findAll().stream().map(shop -> {
            ShopDTO dto = new ShopDTO();
            dto.setId(shop.getId());
            dto.setShopName(shop.getShopName());
            dto.setAddress(shop.getAddress());
            dto.setArea(shop.getArea());
            dto.setIsActive(shop.getIsActive());
            dto.setDeliveryFee(shop.getDeliveryFee());
            dto.setDeliveryRadiusKm(shop.getDeliveryRadiusKm());
            return dto;
        }).collect(Collectors.toList());
    }

    @CacheEvict(value = "shops", allEntries = true)
    public void toggleShop(Long shopId) {
        ButcherShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        shop.setIsActive(!shop.getIsActive());
        shopRepository.save(shop);
    }

    @Transactional
    public void deleteOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        deliveryRepository.findByOrder(order).ifPresent(deliveryRepository::delete);
        orderItemRepository.deleteByOrder(order);
        orderRepository.delete(order);
    }

    @Transactional
    @CacheEvict(value = {"shops", "menus"}, allEntries = true)
    public void deleteShop(Long shopId) {
        ButcherShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        
        List<Order> orders = orderRepository.findByShopOrderByCreatedAtDesc(shop);
        for (Order order : orders) {
            deleteOrder(order.getId());
        }
        
        meatItemRepository.deleteByShop(shop);
        settlementRepository.deleteByShop(shop);
        shopRepository.delete(shop);
    }
    
    private OrderDTO mapToOrderDTO(Order order) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setCustomerId(order.getCustomer().getId());
        dto.setCustomerName(order.getCustomer().getName());
        dto.setCustomerPhone(order.getCustomer().getPhone());
        dto.setShopId(order.getShop().getId());
        dto.setShopName(order.getShop().getShopName());
        dto.setShopPhone(order.getShop().getUser().getPhone());
        dto.setDeliveryAddress(order.getDeliveryAddress());
        dto.setContactName(order.getContactName());
        dto.setContactPhone(order.getContactPhone());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setDeliveryFee(order.getDeliveryFee());
        dto.setServiceFee(order.getServiceFee());
        dto.setLatitude(order.getLatitude());
        dto.setLongitude(order.getLongitude());
        dto.setShopLat(order.getShop().getLatitude());
        dto.setShopLng(order.getShop().getLongitude());
        dto.setStatus(order.getStatus());
        dto.setCreatedAt(order.getCreatedAt());
        
        List<OrderItemDTO> items = orderItemRepository.findByOrder(order).stream().map(item -> {
            OrderItemDTO itemDto = new OrderItemDTO();
            itemDto.setMeatItemId(item.getMeatItem().getId());
            itemDto.setName(item.getMeatItem().getName());
            itemDto.setQuantityGrams(item.getQuantityGrams());
            itemDto.setPrice(item.getPrice());
            return itemDto;
        }).collect(Collectors.toList());
        
        dto.setItems(items);
        return dto;
    }
}
