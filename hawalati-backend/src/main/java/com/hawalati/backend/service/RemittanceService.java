package com.hawalati.backend.service;

import com.hawalati.backend.dto.request.ReceiveRemittanceRequest;
import com.hawalati.backend.dto.request.RemittanceLookupRequest;
import com.hawalati.backend.dto.response.RemittanceLookupResponse;
import com.hawalati.backend.dto.response.TransactionResponse;

import java.util.List;

public interface RemittanceService {
    RemittanceLookupResponse lookup(RemittanceLookupRequest request);
    TransactionResponse receive(ReceiveRemittanceRequest request);
    List<TransactionResponse> history();
}
