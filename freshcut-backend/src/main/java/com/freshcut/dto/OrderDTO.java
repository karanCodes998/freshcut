package com.freshcut.dto;

import com.freshcut.model.OrderStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderDTO {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private Long shopId;
    private String shopName;
    private String shopPhone;
    private String shopAddress;
    private String deliveryAddress;
    private String contactName;
    private String contactPhone;
    private String paymentMethod;
    private BigDecimal totalAmount;
    private BigDecimal deliveryFee;
    private BigDecimal serviceFee;
    private Double shopLat;
    private Double shopLng;
    private Double latitude;
    private Double longitude;
    private OrderStatus status;
    private LocalDateTime createdAt;
    private String riderName;
    private String riderPhone;
    private List<OrderItemDTO> items;
}
