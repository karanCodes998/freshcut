package com.freshcut.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressDTO {
    private Long id;
    private String name;
    private String addressLine;
    private String area;
    private Double latitude;
    private Double longitude;
    private Boolean isDefault;
}
