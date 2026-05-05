package com.freshcut.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ShopDTO {
    private Long id;
    private String shopName;
    private String address;
    private String area;
    private Boolean isActive;
    private BigDecimal deliveryFee;
    private Integer deliveryRadiusKm;
    private Double latitude;
    private Double longitude;
}
