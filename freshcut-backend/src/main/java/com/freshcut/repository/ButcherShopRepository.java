package com.freshcut.repository;

import com.freshcut.model.ButcherShop;
import com.freshcut.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ButcherShopRepository extends JpaRepository<ButcherShop, Long> {
    Optional<ButcherShop> findByUser(User user);
    List<ButcherShop> findByIsActiveTrue();
}
