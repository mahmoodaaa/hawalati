package com.hawalati.backend.init;

import com.hawalati.backend.entity.MockRemittance;
import com.hawalati.backend.enums.RemittanceStatus;
import com.hawalati.backend.repository.MockRemittanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Fictional remittances loaded only when SPRING_PROFILES_ACTIVE=demo. */
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoRemittanceInitializer implements ApplicationRunner {
    // Matches the *fictional* test account used in the project's Swagger examples.
    // Never use real national IDs in public seed data.
    private static final String DEMO_BENEFICIARY_NATIONAL_ID = "9912345678";
    private final MockRemittanceRepository repository;

    @Override
    public void run(ApplicationArguments args) {
        seed("1234567890", "western_union", "200.00", "USD", "141.80",
                "Mohammed Al-Ahmad", "Saudi Arabia", RemittanceStatus.AVAILABLE);
        seed("9876543210", "moneygram", "500.00", "USD", "354.50",
                "Fatima Hassan", "UAE", RemittanceStatus.AVAILABLE);
        seed("SARF-2024-001", "sarie_exchange", "150.00", "JOD", "150.00",
                "Ahmad Yousef", "Jordan", RemittanceStatus.AVAILABLE);
        seed("ALREADY-RECEIVED", "western_union", "300.00", "USD", "212.70",
                "Khalid Omar", "Kuwait", RemittanceStatus.ALREADY_RECEIVED);
        seed("DEMO-WU-2024", "western_union", "750.00", "USD", "531.75",
                "Sara Malik", "USA", RemittanceStatus.AVAILABLE);
        seed("ALW-2024-001", "alawneh_exchange", "400.00", "JOD", "400.00",
                "Samer Khoury", "Jordan", RemittanceStatus.AVAILABLE);
        seed("ZAM-2024-001", "zamzam_exchange", "250.00", "JOD", "250.00",
                "Lina Ali", "Jordan", RemittanceStatus.AVAILABLE);
    }

    private void seed(String reference, String provider, String amount, String currency, String amountJod,
                      String sender, String country, RemittanceStatus status) {
        if (repository.existsByReferenceNumber(reference)) return;
        repository.save(MockRemittance.builder()
                .referenceNumber(reference).provider(provider).amount(new BigDecimal(amount))
                .currency(currency).amountJod(new BigDecimal(amountJod))
                .senderName(sender).senderCountry(country)
                .beneficiaryNationalId(DEMO_BENEFICIARY_NATIONAL_ID)
                .status(status).expiryDate(LocalDate.of(2026, 12, 31)).build());
    }
}
