package com.hawalati.backend.controller;

import com.hawalati.backend.dto.request.ReceiveRemittanceRequest;
import com.hawalati.backend.dto.request.RemittanceLookupRequest;
import com.hawalati.backend.dto.response.RemittanceLookupResponse;
import com.hawalati.backend.dto.response.TransactionResponse;
import com.hawalati.backend.service.RemittanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/remittances")
@RequiredArgsConstructor
@Tag(name = "Remittances")
@SecurityRequirement(name = "bearerAuth")
public class RemittanceController {
    private final RemittanceService remittanceService;

    @PostMapping("/lookup")
    @Operation(summary = "Look up a demo remittance by reference and provider")
    public ResponseEntity<RemittanceLookupResponse> lookup(@Valid @RequestBody RemittanceLookupRequest request) {
        return ResponseEntity.ok(remittanceService.lookup(request));
    }

    @PostMapping("/receive")
    @Operation(summary = "Receive a demo remittance to a bank or wallet")
    public ResponseEntity<TransactionResponse> receive(@Valid @RequestBody ReceiveRemittanceRequest request) {
        return ResponseEntity.ok(remittanceService.receive(request));
    }

    @GetMapping("/history")
    @Operation(summary = "Get the authenticated user's demo transaction history")
    public ResponseEntity<List<TransactionResponse>> history() {
        return ResponseEntity.ok(remittanceService.history());
    }
}
