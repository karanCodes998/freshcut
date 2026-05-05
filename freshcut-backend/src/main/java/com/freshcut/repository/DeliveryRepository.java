package com.freshcut.repository;

import com.freshcut.model.Delivery;
import com.freshcut.model.Order;
import com.freshcut.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    Optional<Delivery> findByOrder(Order order);
    List<Delivery> findByRiderOrderByAcceptedAtDesc(User rider);
    Optional<Delivery> findByRiderAndDeliveredAtIsNull(User rider);
}
