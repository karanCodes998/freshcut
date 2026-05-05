package com.freshcut.repository;

import com.freshcut.model.ButcherShop;
import com.freshcut.model.Order;
import com.freshcut.model.OrderStatus;
import com.freshcut.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerOrderByCreatedAtDesc(User customer);
    List<Order> findByShopOrderByCreatedAtDesc(ButcherShop shop);
    List<Order> findByShopAndStatusOrderByCreatedAtDesc(ButcherShop shop, OrderStatus status);
    List<Order> findByStatus(OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.shop = :shop AND o.createdAt >= :startDate")
    List<Order> findRecentOrdersByShop(@Param("startDate") LocalDateTime startDate, @Param("shop") ButcherShop shop);
}
