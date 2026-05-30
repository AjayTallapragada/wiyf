package com.wiyf.backendspring.controller;

import com.wiyf.backendspring.dto.DetectionResponseDto;
import com.wiyf.backendspring.service.DetectionProxyService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class DetectionProxyController {
    private final DetectionProxyService detectionProxyService;

    public DetectionProxyController(DetectionProxyService detectionProxyService) {
        this.detectionProxyService = detectionProxyService;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\":\"ok\"}");
    }

    @PostMapping(value = "/detect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public DetectionResponseDto detect(@RequestPart("file") MultipartFile file) {
        return detectionProxyService.detect(file);
    }
}
