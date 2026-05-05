package com.freshcut.dto;

import com.freshcut.model.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderStatusUpdate {
    private Long orderId;
    private OrderStatus status;
    private String message;
}
