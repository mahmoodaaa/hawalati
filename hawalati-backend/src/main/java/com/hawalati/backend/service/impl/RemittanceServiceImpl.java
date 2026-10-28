package com.hawalati.backend.service.impl;

import com.hawalati.backend.dto.request.DestinationRequest;
import com.hawalati.backend.dto.request.ReceiveRemittanceRequest;
import com.hawalati.backend.dto.request.RemittanceLookupRequest;
import com.hawalati.backend.dto.response.DestinationResponse;
import com.hawalati.backend.dto.response.RemittanceLookupResponse;
import com.hawalati.backend.dto.response.RemittanceResponse;
import com.hawalati.backend.dto.response.TransactionResponse;
import com.hawalati.backend.entity.MockRemittance;
import com.hawalati.backend.entity.Transaction;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.KycStatus;
import com.hawalati.backend.enums.RemittanceStatus;
import com.hawalati.backend.enums.TransactionStatus;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.repository.MockRemittanceRepository;
import com.hawalati.backend.repository.TransactionRepository;
import com.hawalati.backend.repository.UserRepository;
import com.hawalati.backend.security.SecurityUtils;
import com.hawalati.backend.service.RemittanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RemittanceServiceImpl implements RemittanceService {
    private static final BigDecimal FEE_JOD = new BigDecimal("1.50");
    private static final BigDecimal MIN_TOLERANCE_JOD = new BigDecimal("2.00");
    private static final BigDecimal TOLERANCE_RATE = new BigDecimal("0.10");

    private static final Map<String, String> BANKS = Map.of(
            "arab_bank", "البنك العربي", "cairo_amman", "بنك القاهرة عمان",
            "jordan_ahli", "البنك الأهلي الأردني", "housing_urban", "بنك الإسكان والتعمير",
            "jordan_islamic", "البنك الإسلامي الأردني", "etihad", "البنك الأردني الكويتي",
            "invest", "بنك الاستثمار العربي");
    private static final Map<String, String> WALLETS = Map.of(
            "zain_cash", "زين كاش", "orange_money", "أورنج موني",
            "umniah_joy", "أمنية جوي", "cliq", "كليك - CliQ");

    private final UserRepository userRepository;
    private final MockRemittanceRepository mockRemittanceRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional(readOnly = true)
    public RemittanceLookupResponse lookup(RemittanceLookupRequest request) {
        User user = requireVerifiedUser();
        String reference = normalize(request.getReferenceNumber()).toUpperCase(Locale.ROOT);
        MockRemittance remittance = mockRemittanceRepository
                .findByReferenceNumberIgnoreCase(reference).orElse(null);

        if (remittance == null || !remittance.getBeneficiaryNationalId().equals(user.getNationalId())) {
            return statusOnly("NOT_FOUND");
        }
        if (remittance.getStatus() == RemittanceStatus.ALREADY_RECEIVED
                || transactionRepository.existsByRemittanceId(remittance.getId())) {
            return RemittanceLookupResponse.builder()
                    .status("ALREADY_RECEIVED").remittance(toRemittanceResponse(remittance)).build();
        }
        if (!remittance.getProvider().equals(normalize(request.getProviderId()))) {
            return RemittanceLookupResponse.builder()
                    .status("PROVIDER_MISMATCH")
                    .expectedProvider(remittance.getProvider()).build();
        }
        if (remittance.getExpiryDate().isBefore(LocalDate.now())
                || !approximateAmountMatches(request.getApproxAmount(), remittance.getAmountJod())) {
            return statusOnly("NOT_FOUND");
        }
        return RemittanceLookupResponse.builder()
                .status("AVAILABLE").remittance(toRemittanceResponse(remittance)).build();
    }

    @Override
    @Transactional
    public TransactionResponse receive(ReceiveRemittanceRequest request) {
        User user = requireVerifiedUser();
        // Row lock + UNIQUE remittance FK: only one transaction can claim the remittance.
        MockRemittance remittance = mockRemittanceRepository.findByIdForUpdate(request.getRemittanceId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "الحوالة غير موجودة"));

        if (!remittance.getBeneficiaryNationalId().equals(user.getNationalId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "الحوالة غير مخصصة لهذا المستفيد التجريبي");
        }
        if (remittance.getStatus() != RemittanceStatus.AVAILABLE
                || transactionRepository.existsByRemittanceId(remittance.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "تم استلام الحوالة مسبقًا");
        }
        if (remittance.getExpiryDate().isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "انتهت صلاحية الحوالة");
        }

        DestinationRequest destination = request.getDestination();
        DestinationRequest.Details details = destination.getDetails();
        String type = normalize(destination.getType()).toLowerCase(Locale.ROOT);
        Transaction tx = Transaction.builder()
                .user(user).remittance(remittance)
                .fee(FEE_JOD)
                .netAmount(remittance.getAmountJod().subtract(FEE_JOD).setScale(2, RoundingMode.HALF_UP))
                .status(TransactionStatus.DEMO_COMPLETED)
                .build();

        if (tx.getNetAmount().signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "المبلغ أقل من رسوم الخدمة");
        }
        populateDestination(tx, type, details);
        remittance.setStatus(RemittanceStatus.ALREADY_RECEIVED);
        // Both state change and transaction save happen atomically in PostgreSQL.
        mockRemittanceRepository.save(remittance);
        Transaction saved = transactionRepository.saveAndFlush(tx);
        return toTransactionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> history() {
        User user = requireCurrentUser();
        return transactionRepository.findByUserIdOrderByConfirmedAtDesc(user.getId())
                .stream().map(this::toTransactionResponse).collect(Collectors.toList());
    }

    private User requireCurrentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "المستخدم غير موجود"));
    }

    private User requireVerifiedUser() {
        User user = requireCurrentUser();
        if (!user.isEnabled() || (user.getKycStatus() != KycStatus.DEMO_VERIFIED
                && user.getKycStatus() != KycStatus.VERIFIED)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "أكمل التحقق من الهوية قبل استلام الحوالات");
        }
        return user;
    }

    private boolean approximateAmountMatches(BigDecimal suppliedJod, BigDecimal expectedJod) {
        BigDecimal tolerance = expectedJod.multiply(TOLERANCE_RATE).max(MIN_TOLERANCE_JOD);
        return suppliedJod.subtract(expectedJod).abs().compareTo(tolerance) <= 0;
    }

    private void populateDestination(Transaction tx, String type, DestinationRequest.Details details) {
        if ("bank".equals(type)) {
            String id = normalize(details.getBankId());
            String iban = normalize(details.getIban()).replace(" ", "").toUpperCase(Locale.ROOT);
            String name = normalize(details.getAccountName());
            if (!BANKS.containsKey(id) || !iban.matches("JO[0-9A-Z]{28}") || name.isBlank() || name.length() > 120) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "بيانات الحساب البنكي غير صالحة");
            }
            tx.setDestinationType("bank");
            tx.setBankId(id);
            tx.setBankName(BANKS.get(id));
            tx.setIban(iban); // demo data only; bank ownership is NOT verified
            tx.setAccountName(name);
        } else if ("wallet".equals(type)) {
            String id = normalize(details.getWalletId());
            String phone = normalize(details.getWalletPhone()).replaceAll("[\\s-]", "");
            if (!WALLETS.containsKey(id) || !phone.matches("(07\\d{8}|009627\\d{8}|\\+9627\\d{8})")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "بيانات المحفظة غير صالحة");
            }
            tx.setDestinationType("wallet");
            tx.setWalletId(id);
            tx.setWalletName(WALLETS.get(id));
            tx.setWalletPhone(phone);
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "اختر بنكًا أو محفظة");
        }
    }

    private RemittanceLookupResponse statusOnly(String status) {
        return RemittanceLookupResponse.builder().status(status).build();
    }

    private RemittanceResponse toRemittanceResponse(MockRemittance r) {
        return RemittanceResponse.builder()
                .id(r.getId()).referenceNumber(r.getReferenceNumber()).mtcn(r.getReferenceNumber())
                .provider(r.getProvider()).amount(r.getAmount()).currency(r.getCurrency())
                .amountJOD(r.getAmountJod()).senderName(r.getSenderName())
                .senderCountry(r.getSenderCountry()).status(r.getStatus().name())
                .expiryDate(r.getExpiryDate()).build();
    }

    private TransactionResponse toTransactionResponse(Transaction t) {
        MockRemittance r = t.getRemittance();
        DestinationResponse dest = DestinationResponse.builder()
                .type(t.getDestinationType()).bankId(t.getBankId()).bankName(t.getBankName())
                .iban(mask(t.getIban())).accountName(t.getAccountName())
                .walletId(t.getWalletId()).walletName(t.getWalletName())
                .walletPhone(mask(t.getWalletPhone())).build();
        return TransactionResponse.builder()
                .id(t.getId()).referenceNumber(r.getReferenceNumber()).provider(r.getProvider())
                .senderName(r.getSenderName()).senderCountry(r.getSenderCountry())
                .amount(r.getAmount()).currency(r.getCurrency()).amountJOD(r.getAmountJod())
                .fee(t.getFee()).netAmount(t.getNetAmount())
                .destination(dest).status(t.getStatus().name()).confirmedAt(t.getConfirmedAt()).build();
    }

    private String mask(String value) {
        if (value == null) return null;
        return value.length() <= 4 ? "****" : "****" + value.substring(value.length() - 4);
    }

    private String normalize(String value) { return value == null ? "" : value.trim(); }
}
