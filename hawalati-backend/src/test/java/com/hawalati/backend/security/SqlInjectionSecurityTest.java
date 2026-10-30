package com.hawalati.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hawalati.backend.entity.MockRemittance;
import com.hawalati.backend.entity.Transaction;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.DocumentType;
import com.hawalati.backend.enums.KycStatus;
import com.hawalati.backend.enums.RemittanceStatus;
import com.hawalati.backend.enums.TransactionStatus;
import com.hawalati.backend.repository.MockRemittanceRepository;
import com.hawalati.backend.repository.OtpVerificationRepository;
import com.hawalati.backend.repository.RefreshTokenRepository;
import com.hawalati.backend.repository.TransactionRepository;
import com.hawalati.backend.repository.UserDocumentRepository;
import com.hawalati.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Real HTTP filters, controllers, services, JPA repositories and SQL execution on H2.
 * All identities, credentials, documents and remittances in this class are fictional.
 * H2 verifies binding and isolation; it does not replace PostgreSQL-specific testing.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:hawalati_security_audit;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "spring.jpa.properties.hibernate.session_factory.statement_inspector="
                + "com.hawalati.backend.security.SqlInjectionSecurityTest$SqlCapture",
        "jwt.secret=fictional-hawalati-security-audit-signing-key-for-tests-only",
        "app.otp.demo-enabled=true"
})
@AutoConfigureMockMvc
@ActiveProfiles({"security-audit", "demo"})
@ExtendWith(OutputCaptureExtension.class)
@Transactional
class SqlInjectionSecurityTest {

    private static final String USERNAME = "audit_receiver";
    private static final String PASSWORD = "Fictional-Password-Only!42";
    private static final String PASSWORD_HASH = new BCryptPasswordEncoder().encode(PASSWORD);
    private static final String REFERENCE = "AUDIT-FICTIONAL-001";
    private static final String PROVIDER = "western_union";
    private static final List<String> PAYLOADS = List.of(
            "' OR '1'='1' --",
            "audit_receiver'--",
            "'; DROP TABLE users; --",
            "' UNION SELECT NULL --",
            "' OR pg_sleep(1) IS NULL --",
            "%_'; SELECT 1; --"
    );

    @TempDir
    static Path documentsDirectory;

    @DynamicPropertySource
    static void isolateDocumentStorage(DynamicPropertyRegistry registry) {
        registry.add("app.storage.documents-dir", () -> documentsDirectory.toString());
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtProvider jwt;
    @Autowired DataSource dataSource;
    @Autowired EntityManager entityManager;
    @Autowired UserRepository users;
    @Autowired MockRemittanceRepository remittances;
    @Autowired TransactionRepository transactions;
    @Autowired OtpVerificationRepository otps;
    @Autowired RefreshTokenRepository refreshTokens;
    @Autowired UserDocumentRepository documents;

    private User receiver;
    private User other;
    private MockRemittance ownRemittance;
    private MockRemittance otherRemittance;
    private String accessToken;

    @BeforeEach
    void seedOnlyFictionalData() {
        // The demo initializer runs only against H2 in this explicitly configured test context.
        transactions.deleteAll();
        documents.deleteAll();
        otps.deleteAll();
        refreshTokens.deleteAll();
        remittances.deleteAll();
        users.deleteAll();

        receiver = users.saveAndFlush(fictionalUser(USERNAME, "9900000001", "0790000001"));
        other = users.saveAndFlush(fictionalUser("audit_other", "9900000002", "0790000002"));
        ownRemittance = remittances.saveAndFlush(fictionalRemittance(REFERENCE, receiver));
        otherRemittance = fictionalRemittance("AUDIT-FICTIONAL-OTHER", other);
        otherRemittance.setStatus(RemittanceStatus.ALREADY_RECEIVED);
        otherRemittance = remittances.saveAndFlush(otherRemittance);
        transactions.saveAndFlush(Transaction.builder()
                .user(other).remittance(otherRemittance)
                .fee(new BigDecimal("1.50")).netAmount(new BigDecimal("98.50"))
                .destinationType("wallet").walletId("dinarak").walletName("Fictional Wallet")
                .walletPhone("0790000002").status(TransactionStatus.DEMO_COMPLETED).build());
        accessToken = jwt.generateAccessToken(receiver);
        SqlCapture.clear();
    }

    @AfterEach
    void checkSensitiveValuesAreAbsentFromLogs(CapturedOutput output) {
        assertThat(output.getAll()).doesNotContain(PASSWORD, PASSWORD_HASH, accessToken);
        SqlCapture.clear();
    }

    static Stream<String> injectionPayloads() {
        return PAYLOADS.stream();
    }

    static Stream<Arguments> restrictedProfileInputs() {
        return Stream.of("username", "phone", "fullNameEn")
                .flatMap(field -> PAYLOADS.stream().map(payload -> Arguments.of(field, payload)));
    }

    static Stream<Arguments> freeTextProfileInputs() {
        return Stream.of("fullName", "placeOfBirth", "address")
                .flatMap(field -> PAYLOADS.stream().map(payload -> Arguments.of(field, payload)));
    }

    @Test
    void databaseIsInMemoryAndFixturesAreIsolated() throws Exception {
        try (var connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:hawalati_security_audit");
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("H2");
        }
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("injectionPayloads")
    void loginUsernameCannotBypassCredentialCheck(String payload) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("username", payload, "password", PASSWORD))))
                .andExpect(status().isUnauthorized()).andReturn();
        assertNoSensitiveErrorDetails(result, payload);
        assertBoundSql(payload);
        assertThat(otps.count()).isZero();
        assertThat(refreshTokens.count()).isZero();
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("injectionPayloads")
    void loginPasswordIsCheckedByTheEncoderAsData(String payload) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("username", USERNAME, "password", payload))))
                .andExpect(status().isUnauthorized()).andReturn();
        assertNoSensitiveErrorDetails(result, payload);
        assertBoundSql(payload);
        assertThat(otps.count()).isZero();
        assertThat(refreshTokens.count()).isZero();
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("restrictedProfileInputs")
    void profileRejectsInjectionInConstrainedFields(String field, String payload) throws Exception {
        Map<String, Object> body = profileBody();
        body.put(field, payload);
        MvcResult result = mvc.perform(put("/api/user/profile").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors." + field).exists()).andReturn();
        assertNoSensitiveErrorDetails(result, payload);
        assertThat(SqlCapture.statements()).noneMatch(sql -> sql.toLowerCase(Locale.ROOT).startsWith("update "));
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("freeTextProfileInputs")
    void profileStoresInjectionShapedFreeTextLiterally(String field, String payload) throws Exception {
        Map<String, Object> body = profileBody();
        body.put(field, payload);
        mvc.perform(put("/api/user/profile").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isOk()).andExpect(jsonPath("$." + field).value(payload))
                .andExpect(jsonPath("$.password").doesNotExist());
        entityManager.flush();
        assertBoundSql(payload);
        entityManager.clear();
        User stored = users.findById(receiver.getId()).orElseThrow();
        String storedValue = switch (field) {
            case "fullName" -> stored.getFullNameAr();
            case "placeOfBirth" -> stored.getPlaceOfBirth();
            case "address" -> stored.getAddress();
            default -> throw new AssertionError("Unexpected test field");
        };
        assertThat(storedValue).isEqualTo(payload);
        assertFixturesUnchanged();
    }

    @Test
    void legitimateApostropheRemainsValidProfileData() throws Exception {
        Map<String, Object> body = profileBody();
        body.put("address", "Fictional O'Example Street");
        mvc.perform(put("/api/user/profile").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value("Fictional O'Example Street"));
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("injectionPayloads")
    void lookupReferenceCannotMatchAnotherRowOrExecuteSql(String payload) throws Exception {
        MvcResult result = mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(lookupBody(payload, PROVIDER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NOT_FOUND"))
                .andExpect(jsonPath("$.remittance").isEmpty()).andReturn();
        assertNoSensitiveErrorDetails(result, payload);
        assertBoundSql(payload);
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @MethodSource("injectionPayloads")
    void lookupProviderIsComparedAsLiteralData(String payload) throws Exception {
        MvcResult result = mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(lookupBody(REFERENCE, payload))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PROVIDER_MISMATCH"))
                .andExpect(jsonPath("$.remittance").isEmpty()).andReturn();
        assertNoSensitiveErrorDetails(result, payload);
        assertBoundSql(payload);
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"0 OR 1=1", "1; DROP TABLE users; --", "1 UNION SELECT 1", "1e999999999999"})
    void lookupRejectsSqlTextInNumericAmount(String amount) throws Exception {
        Map<String, Object> body = lookupBody(REFERENCE, PROVIDER);
        body.put("approxAmount", amount);
        MvcResult result = mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isBadRequest()).andReturn();
        assertNoSensitiveErrorDetails(result, amount);
        assertFixturesUnchanged();
    }

    @Test
    void profileAndLookupRequireAuthentication() throws Exception {
        mvc.perform(get("/api/user/profile")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/user/profile").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(profileBody()))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/remittances/lookup").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(lookupBody(REFERENCE, PROVIDER))))
                .andExpect(status().isUnauthorized());
        assertFixturesUnchanged();
    }

    @ParameterizedTest
    @ValueSource(strings = {"refresh", "registration", "tampered", "expired"})
    void profileRejectsTokensThatAreNotValidAccessTokens(String tokenKind) throws Exception {
        String token = switch (tokenKind) {
            case "refresh" -> jwt.generateRefreshToken(receiver);
            case "registration" -> jwt.generateRegistrationToken(receiver.getPhone());
            case "tampered" -> {
                int signatureStart = accessToken.lastIndexOf('.') + 1;
                char replacement = accessToken.charAt(signatureStart) == 'A' ? 'B' : 'A';
                yield accessToken.substring(0, signatureStart) + replacement + accessToken.substring(signatureStart + 1);
            }
            case "expired" -> new JwtProvider(new com.hawalati.backend.config.JwtProperties(
                    "fictional-hawalati-security-audit-signing-key-for-tests-only", -60000L, 60000L))
                    .generateAccessToken(receiver);
            default -> throw new AssertionError("Unexpected token kind");
        };
        MvcResult result = mvc.perform(get("/api/user/profile")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized()).andReturn();
        assertNoSensitiveErrorDetails(result, token);
        assertFixturesUnchanged();
    }

    @Test
    void profileIdentityCannotBeOverriddenByQueryParameters() throws Exception {
        mvc.perform(get("/api/user/profile").header(HttpHeaders.AUTHORIZATION, bearer())
                        .param("userId", other.getId().toString()).param("id", other.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(receiver.getId().toString()))
                .andExpect(jsonPath("$.nationalId").value(receiver.getNationalId()))
                .andExpect(jsonPath("$.password").doesNotExist());
        assertFixturesUnchanged();
    }

    @Test
    void anotherBeneficiaryCannotBeLookedUpOrReceivedAndHistoryIsScoped() throws Exception {
        mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(lookupBody(otherRemittance.getReferenceNumber(), PROVIDER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NOT_FOUND"))
                .andExpect(jsonPath("$.remittance").isEmpty());
        mvc.perform(post("/api/remittances/receive").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(receiveBody(otherRemittance.getId()))))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/remittances/history").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        assertFixturesUnchanged();
    }

    @Test
    void pendingKycCannotLookupOrReceive() throws Exception {
        receiver.setKycStatus(KycStatus.PENDING);
        users.saveAndFlush(receiver);
        mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(lookupBody(REFERENCE, PROVIDER))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/remittances/receive").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(receiveBody(ownRemittance.getId()))))
                .andExpect(status().isForbidden());
        assertFixturesUnchanged();
    }

    @Test
    void validLoginStillRequiresOtpAndDoesNotIssueTokens() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("username", USERNAME, "password", PASSWORD))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.user.password").doesNotExist());
        mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("username", USERNAME, "code", "000000", "purpose", "LOGIN"))))
                .andExpect(status().isBadRequest());
        assertThat(otps.findAll()).singleElement().satisfies(otp -> {
            assertThat(otp.getAttempts()).isEqualTo(1);
            assertThat(otp.getCodeHash()).isNotEqualTo("123456");
        });
        assertThat(refreshTokens.count()).isZero();
        assertFixturesUnchanged();
    }

    @Test
    void validLookupReceiveAndHistoryStillWorkAndRejectDuplicateReceive() throws Exception {
        mvc.perform(post("/api/remittances/lookup").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(lookupBody(REFERENCE, PROVIDER))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE"));
        byte[] body = json.writeValueAsBytes(receiveBody(ownRemittance.getId()));
        mvc.perform(post("/api/remittances/receive").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.fee").value(1.50))
                .andExpect(jsonPath("$.netAmount").value(98.50))
                .andExpect(jsonPath("$.destination.walletPhone").value("****0001"));
        mvc.perform(get("/api/remittances/history").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].referenceNumber").value(REFERENCE));
        mvc.perform(post("/api/remittances/receive").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        assertThat(transactions.count()).isEqualTo(2);
    }

    @Test
    void fictionalDemoRegistrationUploadKycAndLoginStillWork() throws Exception {
        String phone = "0790000003";
        mvc.perform(post("/api/auth/phone-otp/send").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("phone", phone)))).andExpect(status().isOk());
        MvcResult verification = mvc.perform(post("/api/auth/phone-otp/verify").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsBytes(Map.of("phone", phone, "code", "123456"))))
                .andExpect(status().isOk()).andReturn();
        String registrationToken = json.readTree(verification.getResponse().getContentAsString()).get("registrationToken").asText();
        Map<String, Object> registration = profileBody();
        registration.put("username", "audit_registered");
        registration.put("nationalId", "9900000003");
        registration.put("phone", phone);
        registration.put("documentType", "national_id");
        registration.put("password", PASSWORD);
        MockMultipartFile data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE,
                json.writeValueAsBytes(Map.of("registrationToken", registrationToken, "registration", registration)));
        MockMultipartFile file = new MockMultipartFile("file", "fictional-document.pdf", "application/pdf",
                fictionalPdf());
        MvcResult completed = mvc.perform(multipart("/api/auth/registration/complete").file(data).file(file))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.user.kycStatus").value("DEMO_VERIFIED"))
                .andExpect(jsonPath("$.user.documentUploaded").value(true))
                .andExpect(jsonPath("$.user.password").doesNotExist()).andReturn();
        var response = json.readTree(completed.getResponse().getContentAsString());
        String registeredAccess = response.get("accessToken").asText();
        String registeredRefresh = response.get("refreshToken").asText();
        mvc.perform(post("/api/user/kyc").header(HttpHeaders.AUTHORIZATION, "Bearer " + registeredAccess))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("DEMO_VERIFIED"));
        mvc.perform(get("/api/user/document").header(HttpHeaders.AUTHORIZATION, "Bearer " + registeredAccess))
                .andExpect(status().isOk()).andExpect(jsonPath("$.storedFileName").doesNotExist());
        User registered = users.findByUsername("audit_registered").orElseThrow();
        assertThat(registered.getPassword()).isNotEqualTo(PASSWORD);
        assertThat(new BCryptPasswordEncoder().matches(PASSWORD, registered.getPassword())).isTrue();
        assertThat(refreshTokens.findAll()).allSatisfy(token ->
                assertThat(token.getTokenHash()).isNotEqualTo(registeredRefresh));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", "audit_registered", "password", PASSWORD))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("username", "audit_registered", "code", "123456", "purpose", "LOGIN"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    private User fictionalUser(String username, String nationalId, String phone) {
        return User.builder().username(username).password(PASSWORD_HASH).nationalId(nationalId).phone(phone)
                .fullNameAr("Fictional Receiver").fullNameEn("Fictional Receiver")
                .dateOfBirth(LocalDate.of(1999, 1, 1)).placeOfBirth("Fictional City")
                .address("Fictional test address").documentType(DocumentType.NATIONAL_ID)
                .enabled(true).kycStatus(KycStatus.DEMO_VERIFIED).build();
    }

    private MockRemittance fictionalRemittance(String reference, User beneficiary) {
        return MockRemittance.builder().referenceNumber(reference).provider(PROVIDER)
                .beneficiaryNationalId(beneficiary.getNationalId()).amount(new BigDecimal("100.00"))
                .amountJod(new BigDecimal("100.00")).currency("JOD").senderName("Fictional Sender")
                .senderCountry("Fictional Country").status(RemittanceStatus.AVAILABLE)
                .expiryDate(LocalDate.now().plusDays(7)).build();
    }

    private Map<String, Object> profileBody() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Fictional Receiver");
        body.put("fullNameEn", "Fictional Receiver");
        body.put("dateOfBirth", "1999-01-01");
        body.put("placeOfBirth", "Fictional City");
        body.put("address", "Fictional test address");
        body.put("phone", "0790000001");
        body.put("username", USERNAME);
        return body;
    }

    private Map<String, Object> lookupBody(String reference, String provider) {
        return new LinkedHashMap<>(Map.of("referenceNumber", reference,
                "providerId", provider, "approxAmount", new BigDecimal("100.00")));
    }

    private Map<String, Object> receiveBody(UUID remittanceId) {
        return Map.of("remittanceId", remittanceId, "agreed", true, "destination",
                Map.of("type", "wallet", "details", Map.of("walletId", "dinarak", "walletPhone", "0790000001")));
    }

    private String bearer() {
        return "Bearer " + accessToken;
    }

    private void assertBoundSql(String payload) {
        assertThat(SqlCapture.statements()).anyMatch(sql -> sql.contains("?"));
        assertThat(SqlCapture.statements()).allSatisfy(sql -> assertThat(sql.toLowerCase(Locale.ROOT))
                .doesNotContain(payload.toLowerCase(Locale.ROOT)));
    }

    private void assertNoSensitiveErrorDetails(MvcResult result, String suppliedValue) throws Exception {
        var response = json.readTree(result.getResponse().getContentAsString());
        assertThat(response.has("accessToken")).isFalse();
        assertThat(response.has("refreshToken")).isFalse();
        assertThat(response.has("password")).isFalse();
        assertThat(response.has("trace")).isFalse();
        assertThat(result.getResponse().getContentAsString()).doesNotContain(
                suppliedValue, PASSWORD, PASSWORD_HASH, accessToken,
                "org.hibernate", "org.postgresql", "JdbcSQL", "SELECT ", "select ");
    }

    private void assertFixturesUnchanged() {
        // Clear first so a cached entity cannot hide an unintended database mutation.
        entityManager.flush();
        entityManager.clear();
        assertThat(users.count()).isEqualTo(2);
        assertThat(remittances.count()).isEqualTo(2);
        assertThat(transactions.count()).isEqualTo(1);
        User storedReceiver = users.findById(receiver.getId()).orElseThrow();
        assertThat(storedReceiver.getUsername()).isEqualTo(USERNAME);
        assertThat(storedReceiver.getNationalId()).isEqualTo("9900000001");
        assertThat(storedReceiver.getPassword()).isEqualTo(PASSWORD_HASH);
        User storedOther = users.findById(other.getId()).orElseThrow();
        assertThat(storedOther.getUsername()).isEqualTo("audit_other");
        assertThat(storedOther.getAddress()).isEqualTo("Fictional test address");
        assertThat(storedOther.getPassword()).isEqualTo(PASSWORD_HASH);
        assertThat(remittances.findById(ownRemittance.getId()).orElseThrow().getStatus())
                .isEqualTo(RemittanceStatus.AVAILABLE);
        assertThat(remittances.findById(otherRemittance.getId()).orElseThrow().getBeneficiaryNationalId())
                .isEqualTo(other.getNationalId());
    }

    private static byte[] fictionalPdf() {
        return ("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
                + "2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n"
                + "trailer\n<< /Root 1 0 R >>\n%%EOF\n").getBytes(StandardCharsets.US_ASCII);
    }

    /** Records SQL templates only, never values, to assert that payloads remain bind parameters. */
    public static class SqlCapture implements StatementInspector {
        private static final ThreadLocal<List<String>> SQL = ThreadLocal.withInitial(ArrayList::new);

        @Override
        public String inspect(String sql) {
            SQL.get().add(sql);
            return sql;
        }

        static List<String> statements() { return List.copyOf(SQL.get()); }
        static void clear() { SQL.remove(); }
    }
}
