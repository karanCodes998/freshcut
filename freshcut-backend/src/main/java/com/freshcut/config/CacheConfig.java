package com.freshcut.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Simple in-memory cache — no Redis, no external service.
 * Caches shop listings and menus in the JVM heap.
 * When you grow to thousands of users, swap this for Redis.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public ConcurrentMapCacheManager cacheManager() {
        return new ConcurrentMapCacheManager("shops", "menus");
    }
}
