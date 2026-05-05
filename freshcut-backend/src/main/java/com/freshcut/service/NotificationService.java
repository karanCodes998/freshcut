package com.freshcut.service;

import com.freshcut.dto.OrderDTO;
import com.freshcut.dto.OrderStatusUpdate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /** Called by Kafka consumer — push new order to butcher dashboard + rider pool */
    public void notifyNewOrder(OrderDTO orderDTO) {
        messagingTemplate.convertAndSend("/topic/butcher/" + orderDTO.getShopId(), orderDTO);
        messagingTemplate.convertAndSend("/topic/riders", orderDTO);
        log.debug("🔔 WebSocket: notified butcher/{} + riders for order #{}", orderDTO.getShopId(), orderDTO.getId());
    }

    /** Called by Kafka consumer — push status update to customer's tracking page */
    public void notifyOrderStatusUpdate(OrderDTO dto) {
        messagingTemplate.convertAndSend("/topic/order/" + dto.getId(), dto);
        messagingTemplate.convertAndSend("/topic/customer/" + dto.getCustomerId(), dto);
        log.debug("🔄 WebSocket: status update for order #{} → {}", dto.getId(), dto.getStatus());
    }

    /** Called by ButcherService to notify all online riders that an order is ready for pickup */
    public void notifyReadyForRiders(OrderDTO dto) {
        messagingTemplate.convertAndSend("/topic/riders", dto);
        log.debug("🛵 WebSocket: notified riders that order #{} is READY", dto.getId());
    }

    /** Called by ButcherService/RiderService for order status changes */
    public void notifyOrderStatusUpdate(OrderStatusUpdate statusUpdate) {
        messagingTemplate.convertAndSend("/topic/order/" + statusUpdate.getOrderId(), statusUpdate);
    }
}
