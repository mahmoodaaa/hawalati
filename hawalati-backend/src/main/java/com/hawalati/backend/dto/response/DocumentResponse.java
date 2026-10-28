package com.hawalati.backend.dto.response;

import com.hawalati.backend.enums.DocumentType;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    private UUID id;
    private DocumentType documentType;
    private String contentType;
    private long fileSize;
    private LocalDateTime uploadedAt;
}
