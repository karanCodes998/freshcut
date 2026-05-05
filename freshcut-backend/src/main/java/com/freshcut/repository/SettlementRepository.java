package com.freshcut.repository;

import com.freshcut.model.ButcherShop;
import com.freshcut.model.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findByShopOrderByWeekStartDesc(ButcherShop shop);
    List<Settlement> findByWeekStartAndWeekEnd(LocalDate weekStart, LocalDate weekEnd);
    void deleteByShop(ButcherShop shop);
}
