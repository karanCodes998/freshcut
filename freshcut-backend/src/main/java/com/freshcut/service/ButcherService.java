package com.freshcut.service;

import com.freshcut.dto.MeatItemDTO;
import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.OrderItemDTO;
import com.freshcut.dto.OrderStatusUpdate;
import com.freshcut.model.*;
import com.freshcut.repository.ButcherShopRepository;
import com.freshcut.repository.MeatItemRepository;
import com.freshcut.repository.OrderItemRepository;
import com.freshcut.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ButcherService {

    private final ButcherShopRepository shopRepository;
    private final MeatItemRepository meatItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final NotificationService notificationService;

    public ButcherShop getShopByUser(User user) {
        return shopRepository.findByUser(user)
                .orElse(null); // Return null if no shop yet
    }

    @CacheEvict(value = "shops", allEntries = true)
    public ButcherShop createShop(User user, ButcherShop newShop) {
        if (shopRepository.findByUser(user).isPresent()) {
            throw new RuntimeException("You already have a registered shop");
        }
        newShop.setUser(user);
        newShop.setIsActive(true);
        return shopRepository.save(newShop);
    }

    @CacheEvict(value = "shops", allEntries = true)
    public ButcherShop updateShop(User user, ButcherShop updatedShop) {
        ButcherShop shop = shopRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Shop not found for this user"));
        shop.setShopName(updatedShop.getShopName());
        shop.setAddress(updatedShop.getAddress());
        shop.setArea(updatedShop.getArea());
        if (updatedShop.getLatitude() != null) shop.setLatitude(updatedShop.getLatitude());
        if (updatedShop.getLongitude() != null) shop.setLongitude(updatedShop.getLongitude());
        return shopRepository.save(shop);
    }

    @CacheEvict(value = "shops", allEntries = true)
    public ButcherShop updateDeliverySettings(User user, java.util.Map<String, Object> body) {
        ButcherShop shop = shopRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        if (body.containsKey("deliveryFee")) {
            shop.setDeliveryFee(new java.math.BigDecimal(body.get("deliveryFee").toString()));
        }
        if (body.containsKey("deliveryRadiusKm")) {
            shop.setDeliveryRadiusKm(Integer.parseInt(body.get("deliveryRadiusKm").toString()));
        }
        return shopRepository.save(shop);
    }

    public List<MeatItem> getItems(User user) {
        ButcherShop shop = shopRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("No shop found"));
        return meatItemRepository.findByShop(shop);
    }

    @CacheEvict(value = "menus", allEntries = true)
    public MeatItem addItem(User user, MeatItemDTO itemDTO) {
        ButcherShop shop = getShopByUser(user);
        MeatItem item = MeatItem.builder()
                .shop(shop)
                .name(itemDTO.getName())
                .description(itemDTO.getDescription())
                .pricePerKg(itemDTO.getPricePerKg())
                .imageUrl(itemDTO.getImageUrl())
                .build();
        return meatItemRepository.save(item);
    }

    @CacheEvict(value = "menus", allEntries = true)
    public MeatItem updateItem(User user, Long itemId, MeatItemDTO itemDTO) {
        ButcherShop shop = shopRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("No shop found"));
        MeatItem item = meatItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized to modify this item");
        }

        if (itemDTO.getName() != null) item.setName(itemDTO.getName());
        if (itemDTO.getDescription() != null) item.setDescription(itemDTO.getDescription());
        if (itemDTO.getPricePerKg() != null) item.setPricePerKg(itemDTO.getPricePerKg());
        if (itemDTO.getImageUrl() != null) item.setImageUrl(itemDTO.getImageUrl());

        return meatItemRepository.save(item);
    }

    @CacheEvict(value = "menus", allEntries = true)
    public void deleteItem(User user, Long itemId) {
        ButcherShop shop = getShopByUser(user);
        MeatItem item = meatItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        
        if (!item.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized to modify this item");
        }
        
        meatItemRepository.delete(item);
    }

    /** Only update the image URL — preserves all other item fields */
    @CacheEvict(value = "menus", allEntries = true)
    public MeatItem updateItemImage(User user, Long itemId, String imageUrl) {
        ButcherShop shop = shopRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("No shop found"));
        MeatItem item = meatItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        if (!item.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        item.setImageUrl(imageUrl);
        return meatItemRepository.save(item);
    }

    public MeatItem toggleAvailability(User user, Long itemId) {
        ButcherShop shop = getShopByUser(user);
        MeatItem item = meatItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        
        if (!item.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized to modify this item");
        }
        
        item.setIsAvailable(!item.getIsAvailable());
        return meatItemRepository.save(item);
    }

    public List<OrderDTO> getOrders(User user) {
        ButcherShop shop = getShopByUser(user);
        return orderRepository.findByShopOrderByCreatedAtDesc(shop).stream()
                .map(this::mapToOrderDTO)
                .collect(Collectors.toList());
    }

    public void updateOrderStatus(User user, Long orderId, OrderStatus newStatus) {
        ButcherShop shop = getShopByUser(user);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        if (!order.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Unauthorized to modify this order");
        }
        
        order.setStatus(newStatus);
        orderRepository.save(order);
        
        // Notify customer
        notificationService.notifyOrderStatusUpdate(new OrderStatusUpdate(orderId, newStatus, "Order status updated to " + newStatus));
        
        // If order is ready, notify riders
        if (newStatus == OrderStatus.READY) {
            notificationService.notifyReadyForRiders(mapToOrderDTO(order));
        }
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
        dto.setShopAddress(order.getShop().getAddress());
        dto.setDeliveryAddress(order.getDeliveryAddress());
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
        
        dto.setContactName(order.getContactName());
        dto.setContactPhone(order.getContactPhone());
        dto.setItems(items);
        return dto;
    }
}
