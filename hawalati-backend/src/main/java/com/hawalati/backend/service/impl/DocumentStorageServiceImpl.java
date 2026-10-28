package com.hawalati.backend.service.impl;

import com.hawalati.backend.config.StorageProperties;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.service.DocumentStorageService;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DocumentStorageServiceImpl implements DocumentStorageService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] PDF = {0x25, 0x50, 0x44, 0x46};

    private final Path documentsDir;

    public DocumentStorageServiceImpl(StorageProperties storageProperties) {
        String dir = storageProperties.documentsDir() == null || storageProperties.documentsDir().isBlank()
                ? "./uploads/documents"
                : storageProperties.documentsDir();
        this.documentsDir = Paths.get(dir).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(documentsDir);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to create documents directory: " + documentsDir, ex);
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "يرجى رفع ملف الوثيقة");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "حجم الملف يجب ألا يتجاوز 5 ميغابايت");
        }

        byte[] header = readHeader(file);
        DetectedType detected = detectType(header);
        if (detected == null) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "يُسمح فقط بملفات JPEG وPNG وPDF");
        }

        String storedFileName = UUID.randomUUID() + detected.extension();
        Path target = documentsDir.resolve(storedFileName).normalize();
        if (!target.startsWith(documentsDir)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "اسم الملف غير صالح");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "تعذر حفظ الملف");
        }

        return new StoredFile(storedFileName, detected.contentType(), file.getSize());
    }

    @Override
    public void delete(String storedFileName) {
        if (storedFileName == null || storedFileName.isBlank()) {
            return;
        }
        Path target = documentsDir.resolve(storedFileName).normalize();
        if (!target.startsWith(documentsDir)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Best-effort cleanup; metadata remains the source of truth.
        }
    }

    DetectedType detectType(byte[] header) {
        if (startsWith(header, JPEG)) {
            return new DetectedType("image/jpeg", ".jpg");
        }
        if (startsWith(header, PNG)) {
            return new DetectedType("image/png", ".png");
        }
        if (startsWith(header, PDF)) {
            return new DetectedType("application/pdf", ".pdf");
        }
        return null;
    }

    private byte[] readHeader(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            int length = Math.min(bytes.length, 16);
            byte[] header = new byte[length];
            System.arraycopy(bytes, 0, header, 0, length);
            return header;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "تعذر قراءة الملف");
        }
    }

    private boolean startsWith(byte[] source, byte[] prefix) {
        if (source == null || source.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (source[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    record DetectedType(String contentType, String extension) {
    }
}
