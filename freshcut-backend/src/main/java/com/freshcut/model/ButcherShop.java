package com.freshcut.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "butcher_shops")
public class ButcherShop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "shop_name", nullable = false, length = 100)
    private String shopName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String area;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "delivery_fee")
    @Builder.Default
    private java.math.BigDecimal deliveryFee = java.math.BigDecimal.valueOf(40);

    @Column(name = "delivery_radius_km")
    @Builder.Default
    private Integer deliveryRadiusKm = 10;

    @Column
    private Double latitude;

    @Column
    private Double longitude;
}
