package com.hawalati.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DocumentType {
    NATIONAL_ID("national_id"),
    PASSPORT("passport"),
    LICENSE("license");

    private final String value;

    DocumentType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DocumentType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (DocumentType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unsupported document type: " + value);
    }
}
