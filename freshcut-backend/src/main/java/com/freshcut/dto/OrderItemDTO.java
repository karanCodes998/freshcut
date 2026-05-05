package com.freshcut.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OrderItemDTO {
    private Long meatItemId;
    private String name;
    private Integer quantityGrams;
    private BigDecimal price;
}
