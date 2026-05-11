package com.freshcut.repository;

import com.freshcut.model.Address;
import com.freshcut.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUser(User user);
    List<Address> findByUserOrderByIsDefaultDesc(User user);
}
