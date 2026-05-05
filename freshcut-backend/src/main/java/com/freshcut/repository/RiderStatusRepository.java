package com.freshcut.repository;

import com.freshcut.model.RiderStatus;
import com.freshcut.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RiderStatusRepository extends JpaRepository<RiderStatus, Long> {
    Optional<RiderStatus> findByRider(User rider);
    List<RiderStatus> findByIsOnlineTrue();
}
