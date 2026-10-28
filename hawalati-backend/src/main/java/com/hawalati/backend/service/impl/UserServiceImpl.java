package com.hawalati.backend.service.impl;

import com.hawalati.backend.config.OtpProperties;
import com.hawalati.backend.dto.request.ChangePasswordRequest;
import com.hawalati.backend.dto.request.UpdateProfileRequest;
import com.hawalati.backend.dto.response.DocumentResponse;
import com.hawalati.backend.dto.response.KycResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.UserProfileResponse;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.entity.UserDocument;
import com.hawalati.backend.enums.DocumentType;
import com.hawalati.backend.enums.KycStatus;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.mapper.UserMapper;
import com.hawalati.backend.repository.RefreshTokenRepository;
import com.hawalati.backend.repository.UserDocumentRepository;
import com.hawalati.backend.repository.UserRepository;
import com.hawalati.backend.security.SecurityUtils;
import com.hawalati.backend.service.DocumentStorageService;
import com.hawalati.backend.service.DocumentStorageService.StoredFile;
import com.hawalati.backend.service.UserService;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserDocumentRepository userDocumentRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final DocumentStorageService documentStorageService;
    private final OtpProperties otpProperties;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile() {
        User user = currentUser();
        return toProfile(user);
    }

    @Override
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        User user = currentUser();

        String username = request.getUsername() == null ? "" : request.getUsername().trim().toLowerCase();
        String phone = request.getPhone() == null ? "" : request.getPhone().replaceAll("[\\s-]", "").trim();

        if (userRepository.existsByUsernameAndIdNot(username, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "اسم المستخدم مأخوذ، اختر اسماً آخر.");
        }
        if (userRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "رقم الهاتف مسجّل مسبقًا.");
        }

        boolean sensitiveChanged = sensitiveIdentityChanged(user, request);
        userMapper.applyUpdate(user, request);

        if (sensitiveChanged && isVerifiedKyc(user.getKycStatus())) {
            user.setKycStatus(KycStatus.PENDING);
        }

        return toProfile(userRepository.save(user));
    }

    @Override
    public MessageResponse changePassword(ChangePasswordRequest request) {
        User user = currentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "كلمة المرور الحالية غير صحيحة");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "كلمة المرور الجديدة يجب أن تختلف عن الحالية");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllForUser(user);

        return MessageResponse.builder()
                .message("تم تغيير كلمة المرور. استخدم الرمز الحالي حتى انتهائه، ثم سجّل الدخول مجددًا.")
                .build();
    }


    @Override
    public DocumentResponse uploadDocument(MultipartFile file, DocumentType documentType) {

        User user = currentUser();
        // Save new file
        StoredFile stored = documentStorageService.store(file);

        DocumentType type = documentType != null
                ? documentType
                : user.getDocumentType();

        UserDocument document = userDocumentRepository.findByUserId(user.getId())
                .orElse(null);

        // Keep old file until DB transaction succeeds
        String oldFileName = document == null ? null : document.getStoredFileName();

        // File cleanup based on transaction result
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {
                        // Delete old file only after successful commit
                        if (oldFileName != null) {
                            documentStorageService.delete(oldFileName);
                        }
                    }

                    @Override
                    public void afterCompletion(int status) {
                        // Remove new file if DB transaction failed
                        if (status != STATUS_COMMITTED) {
                            documentStorageService.delete(
                                    stored.storedFileName()
                            );
                        }
                    }
                }
        );

        if (document == null) {
            document = UserDocument.builder()
                    .user(user)
                    .build();
        }

        document.setDocumentType(type);
        document.setStoredFileName(stored.storedFileName());
        document.setContentType(stored.contentType());
        document.setFileSize(stored.fileSize());
        document.setUploadedAt(LocalDateTime.now());

        user.setDocumentType(type);

        if (isVerifiedKyc(user.getKycStatus())) {
            user.setKycStatus(KycStatus.PENDING);
        }

        userRepository.save(user);

        UserDocument savedDocument =
                userDocumentRepository.save(document);

        return toDocumentResponse(savedDocument);
    }


    @Override
    @Transactional(readOnly = true)
    public DocumentResponse getDocument() {
        UserDocument document = userDocumentRepository.findByUserId(currentUser().getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "لا توجد وثيقة مرفوعة"));
        return toDocumentResponse(document);
    }


    @Override
    public KycResponse submitKyc() {

        User user = currentUser();

        // Demo verification is allowed only in demo mode
        if (!otpProperties.demoEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "التحقق التجريبي متاح فقط في وضع Demo");
        }

        if (!user.isEnabled()) {throw new ApiException(
                HttpStatus.BAD_REQUEST, "يجب تفعيل الحساب قبل التحقق من الهوية");
        }

        if (!userDocumentRepository.existsByUserId(user.getId())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "يرجى رفع وثيقة الهوية أولاً"
            );
        }

        user.setKycStatus(KycStatus.DEMO_VERIFIED);
        userRepository.save(user);

        return KycResponse.builder()
                .status(KycStatus.DEMO_VERIFIED)
                .demo(true)
                .message("تم التحقق التجريبي من الهوية بنجاح")
                .build();
    }


    private User currentUser() {
        UUID userId = SecurityUtils.currentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "المستخدم غير موجود"));
    }

    private UserProfileResponse toProfile(User user) {
        UserProfileResponse response = userMapper.toProfileResponse(user);
        response.setDocumentUploaded(userDocumentRepository.existsByUserId(user.getId()));
        return response;
    }

    private DocumentResponse toDocumentResponse(UserDocument document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .documentType(document.getDocumentType())
                .contentType(document.getContentType())
                .fileSize(document.getFileSize())
                .uploadedAt(document.getUploadedAt())
                .build();
    }

    private boolean sensitiveIdentityChanged(User user, UpdateProfileRequest request) {
        String newArabic = request.getFullName() == null ? null : request.getFullName().trim();
        String newEnglish = request.getFullNameEn() == null ? null : request.getFullNameEn().trim();
        boolean nameChanged = !Objects.equals(user.getFullNameAr(), newArabic)
                || !Objects.equals(user.getFullNameEn(), newEnglish);
        boolean dobChanged = request.getDateOfBirth() != null
                && !Objects.equals(user.getDateOfBirth(), request.getDateOfBirth());
        return nameChanged || dobChanged;
    }

    private boolean isVerifiedKyc(KycStatus status) {
        return status == KycStatus.DEMO_VERIFIED || status == KycStatus.VERIFIED;
    }
}
