package com.hawalati.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface DocumentStorageService {

    StoredFile store(MultipartFile file);

    void delete(String storedFileName);

    record StoredFile(String storedFileName, String contentType, long fileSize) {
    }
}
