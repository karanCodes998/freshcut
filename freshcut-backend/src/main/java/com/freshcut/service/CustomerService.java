package com.freshcut.service;

import com.freshcut.dto.AddressDTO;
import com.freshcut.dto.MeatItemDTO;
import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.OrderItemDTO;
import com.freshcut.dto.ShopDTO;
import com.freshcut.model.*;
import com.freshcut.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final ButcherShopRepository shopRepository;
    private final MeatItemRepository meatItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryRepository deliveryRepository;
    private final AddressRepository addressRepository;
    private final NotificationService notificationService;

    @Cacheable(value = "shops", key = "#lat + '-' + #lng")
    public List<ShopDTO> getActiveShops(Double lat, Double lng) {
        List<ButcherShop> shops = shopRepository.findByIsActiveTrue();
        
        return shops.stream()
                .map(shop -> {
                    ShopDTO dto = new ShopDTO();
                    dto.setId(shop.getId());
                    dto.setShopName(shop.getShopName());
                    dto.setAddress(shop.getAddress());
                    dto.setArea(shop.getArea());
                    dto.setIsActive(shop.getIsActive());
                    dto.setDeliveryFee(shop.getDeliveryFee());
                    dto.setDeliveryRadiusKm(shop.getDeliveryRadiusKm());
                    dto.setLatitude(shop.getLatitude());
                    dto.setLongitude(shop.getLongitude());
                    
                    if (lat != null && lng != null && shop.getLatitude() != null && shop.getLongitude() != null) {
                        double distance = calculateDistance(lat, lng, shop.getLatitude(), shop.getLongitude());
                        dto.setDistanceKm(distance);
                    }
                    return dto;
                })
                .filter(dto -> {
                    // Filter by 20km radius if location is provided
                    if (lat != null && lng != null && dto.getDistanceKm() != null) {
                        return dto.getDistanceKm() <= 20.0;
                    }
                    return true;
                })
                .sorted((a, b) -> {
                    if (a.getDistanceKm() != null && b.getDistanceKm() != null) {
                        return a.getDistanceKm().compareTo(b.getDistanceKm());
                    }
                    return 0;
                })
                .collect(Collectors.toList());
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public List<AddressDTO> getAddresses(User user) {
        return addressRepository.findByUserOrderByIsDefaultDesc(user).stream()
                .map(this::mapToAddressDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AddressDTO saveAddress(User user, AddressDTO dto) {
        if (Boolean.TRUE.equals(dto.getIsDefault())) {
            // Unset other defaults
            List<Address> addresses = addressRepository.findByUser(user);
            addresses.forEach(a -> a.setIsDefault(false));
            addressRepository.saveAll(addresses);
        }

        Address address = Address.builder()
                .user(user)
                .name(dto.getName())
                .addressLine(dto.getAddressLine())
                .area(dto.getArea())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .isDefault(dto.getIsDefault() != null ? dto.getIsDefault() : false)
                .build();
        
        return mapToAddressDTO(addressRepository.save(address));
    }

    @Transactional
    public void deleteAddress(User user, Long id) {
        Address address = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Address not found"));
        if (!address.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        addressRepository.delete(address);
    }

    private AddressDTO mapToAddressDTO(Address address) {
        return AddressDTO.builder()
                .id(address.getId())
                .name(address.getName())
                .addressLine(address.getAddressLine())
                .area(address.getArea())
                .latitude(address.getLatitude())
                .longitude(address.getLongitude())
                .isDefault(address.getIsDefault())
                .build();
    }

    @Cacheable(value = "menus", key = "#shopId")
    public List<MeatItemDTO> getShopMenu(Long shopId) {
        ButcherShop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        return meatItemRepository.findByShopAndIsAvailableTrue(shop).stream().map(item -> {
            MeatItemDTO dto = new MeatItemDTO();
            dto.setId(item.getId());
            dto.setShopId(shop.getId());
            dto.setName(item.getName());
            dto.setDescription(item.getDescription());
            dto.setPricePerKg(item.getPricePerKg());
            dto.setImageUrl(item.getImageUrl());
            dto.setIsAvailable(item.getIsAvailable());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO placeOrder(User user, OrderDTO orderRequest) {
        ButcherShop shop = shopRepository.findById(orderRequest.getShopId())
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        
        BigDecimal totalFoodAmount = BigDecimal.ZERO;

        Order order = Order.builder()
                .customer(user)
                .shop(shop)
                .deliveryAddress(orderRequest.getDeliveryAddress())
                .contactName(orderRequest.getContactName())
                .contactPhone(orderRequest.getContactPhone())
                .paymentMethod("COD")
                .latitude(orderRequest.getLatitude())
                .longitude(orderRequest.getLongitude())
                .status(OrderStatus.PLACED)
                .totalAmount(BigDecimal.ZERO)
                .serviceFee(new BigDecimal("9.00"))
                .build();
        
        order = orderRepository.save(order);

        for (OrderItemDTO itemReq : orderRequest.getItems()) {
            MeatItem meatItem = meatItemRepository.findById(itemReq.getMeatItemId())
                    .orElseThrow(() -> new RuntimeException("Meat item not found"));
            
            BigDecimal price = meatItem.getPricePerKg()
                    .multiply(BigDecimal.valueOf(itemReq.getQuantityGrams()))
                    .divide(BigDecimal.valueOf(1000));
            
            totalFoodAmount = totalFoodAmount.add(price);

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .meatItem(meatItem)
                    .quantityGrams(itemReq.getQuantityGrams())
                    .price(price)
                    .build();
            
            orderItemRepository.save(orderItem);
        }

        BigDecimal deliveryFee = orderRequest.getDeliveryFee() != null ? orderRequest.getDeliveryFee() : 
                               (shop.getDeliveryFee() != null ? shop.getDeliveryFee() : BigDecimal.valueOf(40));
        BigDecimal serviceFee = new BigDecimal("9.00");
        BigDecimal commission = totalFoodAmount.multiply(BigDecimal.valueOf(0.15));

        order.setDeliveryFee(deliveryFee);
        order.setTotalAmount(totalFoodAmount.add(deliveryFee).add(serviceFee));
        order.setPlatformCommission(commission);
        order = orderRepository.save(order);

        OrderDTO responseDTO = mapToOrderDTO(order);
        
        // Push real-time WebSocket notification to butcher + available riders
        notificationService.notifyNewOrder(responseDTO);
        log.info("✅ Order #{} placed and notifications sent", order.getId());

        return responseDTO;
    }

    public OrderDTO getOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (!order.getCustomer().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        return mapToOrderDTO(order);
    }

    public List<OrderDTO> getOrderHistory(User user) {
        return orderRepository.findByCustomerOrderByCreatedAtDesc(user).stream()
                .map(this::mapToOrderDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO cancelOrder(User user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        if (!order.getCustomer().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }
        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.ACCEPTED) {
            throw new RuntimeException("Order cannot be cancelled at this stage");
        }
        order.setStatus(OrderStatus.CANCELLED);
        order = orderRepository.save(order);
        
        OrderDTO responseDTO = mapToOrderDTO(order);
        notificationService.notifyNewOrder(responseDTO); // Notify butcher via websocket
        
        return responseDTO;
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
        dto.setContactName(order.getContactName());
        dto.setContactPhone(order.getContactPhone());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setDeliveryFee(order.getDeliveryFee());
        dto.setServiceFee(order.getServiceFee());
        dto.setLatitude(order.getLatitude());
        dto.setLongitude(order.getLongitude());
        dto.setShopLat(order.getShop().getLatitude());
        dto.setShopLng(order.getShop().getLongitude());
        dto.setStatus(order.getStatus());
        dto.setCreatedAt(order.getCreatedAt());

        deliveryRepository.findByOrder(order).ifPresent(delivery -> {
            dto.setRiderName(delivery.getRider().getName());
            dto.setRiderPhone(delivery.getRider().getPhone());
        });

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
