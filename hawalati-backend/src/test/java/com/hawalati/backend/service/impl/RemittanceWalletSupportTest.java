package com.hawalati.backend.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.hawalati.backend.dto.request.DestinationRequest;
import com.hawalati.backend.dto.request.ReceiveRemittanceRequest;
import com.hawalati.backend.entity.MockRemittance;
import com.hawalati.backend.entity.Transaction;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.KycStatus;
import com.hawalati.backend.enums.RemittanceStatus;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.repository.MockRemittanceRepository;
import com.hawalati.backend.repository.TransactionRepository;
import com.hawalati.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class RemittanceWalletSupportTest {
    private final UserRepository users = mock(UserRepository.class);
    private final MockRemittanceRepository remittances = mock(MockRemittanceRepository.class);
    private final TransactionRepository transactions = mock(TransactionRepository.class);
    private RemittanceServiceImpl service;
    private User user;
    private MockRemittance remittance;

    @BeforeEach
    void setUp() {
        service = new RemittanceServiceImpl(users, remittances, transactions);
        user = User.builder().id(UUID.randomUUID()).nationalId("9912345678")
                .enabled(true).kycStatus(KycStatus.DEMO_VERIFIED).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        remittance = MockRemittance.builder().id(UUID.randomUUID()).referenceNumber("TEST-WALLET")
                .beneficiaryNationalId(user.getNationalId()).provider("western_union")
                .amount(new BigDecimal("100.00")).amountJod(new BigDecimal("100.00")).currency("JOD")
                .senderName("Test Sender").senderCountry("Jordan").status(RemittanceStatus.AVAILABLE)
                .expiryDate(LocalDate.now().plusDays(1)).build();
        when(remittances.findByIdForUpdate(remittance.getId())).thenReturn(Optional.of(remittance));
        when(transactions.saveAndFlush(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction tx = invocation.getArgument(0);
            tx.setId(UUID.randomUUID());
            tx.setConfirmedAt(LocalDateTime.now());
            return tx;
        });
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    private ReceiveRemittanceRequest request(String walletId, String phone) {
        return ReceiveRemittanceRequest.builder().remittanceId(remittance.getId()).agreed(true)
                .destination(DestinationRequest.builder().type("wallet").details(
                        DestinationRequest.Details.builder().walletId(walletId).walletPhone(phone).build()).build()).build();
    }

    @ParameterizedTest
    @CsvSource({"alawneh_pay,العلاونة باي", "dinarak,دينارك"})
    void receivesToNewWalletWithServerNameMaskedPhoneAndNormalFee(String walletId, String expectedName) {
        var result = service.receive(request(walletId, "0791234567"));
        assertEquals(walletId, result.getDestination().getWalletId());
        assertEquals(expectedName, result.getDestination().getWalletName());
        assertEquals("****4567", result.getDestination().getWalletPhone());
        assertEquals(new BigDecimal("1.50"), result.getFee());
        assertEquals(new BigDecimal("98.50"), result.getNetAmount());
        assertEquals(RemittanceStatus.ALREADY_RECEIVED, remittance.getStatus());
        verify(transactions, times(1)).saveAndFlush(any(Transaction.class));
    }

    @Test
    void newWalletStillRejectsInvalidPhone() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ApiException.class,
                () -> service.receive(request("dinarak", "123"))).getStatus());
        verify(transactions, never()).saveAndFlush(any(Transaction.class));
    }

    @Test
    void newWalletStillRequiresCompletedKyc() {
        user.setKycStatus(KycStatus.PENDING);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.receive(request("alawneh_pay", "0791234567"))).getStatus());
        verify(transactions, never()).saveAndFlush(any(Transaction.class));
    }

    @Test
    void newWalletStillRequiresMatchingBeneficiary() {
        remittance.setBeneficiaryNationalId("9900000000");
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> service.receive(request("dinarak", "0791234567"))).getStatus());
        verify(transactions, never()).saveAndFlush(any(Transaction.class));
    }
}
