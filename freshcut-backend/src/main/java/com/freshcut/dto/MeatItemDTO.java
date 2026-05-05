package com.freshcut.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class MeatItemDTO {
    private Long id;
    private Long shopId;
    private String name;
    private String description;
    private BigDecimal pricePerKg;
    private String imageUrl;
    private Boolean isAvailable;
}
