package com.freshcut.service;

import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.OrderItemDTO;
import com.freshcut.dto.OrderStatusUpdate;
import com.freshcut.model.*;
import com.freshcut.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RiderService {

    private final RiderStatusRepository riderStatusRepository;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderItemRepository orderItemRepository;
    private final NotificationService notificationService;

    public void setStatus(User user, boolean isOnline) {
        RiderStatus status = riderStatusRepository.findByRider(user)
                .orElse(RiderStatus.builder().rider(user).build());
        status.setIsOnline(isOnline);
        riderStatusRepository.save(status);
    }

    public List<OrderDTO> getAvailableOrders() {
        return orderRepository.findByStatus(OrderStatus.READY).stream()
                .map(this::mapToOrderDTO)
                .collect(Collectors.toList());
    }

    public OrderDTO getActiveDelivery(User user) {
        return deliveryRepository.findByRiderAndDeliveredAtIsNull(user)
                .map(d -> mapToOrderDTO(d.getOrder()))
                .orElse(null);
    }

    public void acceptOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != OrderStatus.READY) {
            throw new RuntimeException("Order is not ready for pickup yet");
        }

        if (deliveryRepository.findByOrder(order).isPresent()) {
            throw new RuntimeException("Order already accepted by another rider");
        }

        Delivery delivery = Delivery.builder()
                .order(order)
                .rider(user)
                .acceptedAt(LocalDateTime.now())
                .build();
        
        deliveryRepository.save(delivery);
    }

    public void pickupOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
                
        Delivery delivery = deliveryRepository.findByOrder(order)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));
                
        if (!delivery.getRider().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        delivery.setPickedUpAt(LocalDateTime.now());
        deliveryRepository.save(delivery);
        
        order.setStatus(OrderStatus.PICKED_UP);
        orderRepository.save(order);
        
        notificationService.notifyOrderStatusUpdate(new OrderStatusUpdate(orderId, OrderStatus.PICKED_UP, "Order picked up by rider"));
    }

    public void deliverOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
                
        Delivery delivery = deliveryRepository.findByOrder(order)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));
                
        if (!delivery.getRider().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        delivery.setDeliveredAt(LocalDateTime.now());
        deliveryRepository.save(delivery);
        
        order.setStatus(OrderStatus.DELIVERED);
        orderRepository.save(order);
        
        notificationService.notifyOrderStatusUpdate(new OrderStatusUpdate(orderId, OrderStatus.DELIVERED, "Order delivered successfully"));
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
