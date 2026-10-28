package com.hawalati.backend.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hawalati.backend.config.StorageProperties;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.service.DocumentStorageService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

class DocumentStorageServiceImplTest {

    @TempDir
    Path tempDir;

    private DocumentStorageServiceImpl storageService;

    @BeforeEach
    void setUp() {
        storageService = new DocumentStorageServiceImpl(new StorageProperties(tempDir.toString()));
        storageService.init();
    }

    @Test
    void detectsJpegPngAndPdfByMagicBytes() {
        assertEquals("image/jpeg", storageService.detectType(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}).contentType());
        assertEquals("image/png", storageService.detectType(new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        }).contentType());
        assertEquals("application/pdf", storageService.detectType("%PDF-1.4".getBytes()).contentType());
        assertNull(storageService.detectType("hello".getBytes()));
    }

    @Test
    void storesPngWithRandomNameInsideDocumentsDir() throws Exception {
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "id.png", "image/png", png);

        DocumentStorageService.StoredFile stored = storageService.store(file);

        assertEquals("image/png", stored.contentType());
        assertTrue(stored.storedFileName().endsWith(".png"));
        assertTrue(Files.exists(tempDir.resolve(stored.storedFileName())));
        assertNotNull(stored.storedFileName());
    }

    @Test
    void rejectsDisguisedTextFile() {
        MockMultipartFile file = new MockMultipartFile("file", "id.png", "image/png", "not-an-image".getBytes());
        ApiException ex = assertThrows(ApiException.class, () -> storageService.store(file));
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ex.getStatus());
    }
}
