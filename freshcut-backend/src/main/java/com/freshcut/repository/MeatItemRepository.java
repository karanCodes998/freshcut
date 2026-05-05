package com.freshcut.repository;

import com.freshcut.model.ButcherShop;
import com.freshcut.model.MeatItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeatItemRepository extends JpaRepository<MeatItem, Long> {
    List<MeatItem> findByShop(ButcherShop shop);
    List<MeatItem> findByShopAndIsAvailableTrue(ButcherShop shop);
    void deleteByShop(ButcherShop shop);
}
