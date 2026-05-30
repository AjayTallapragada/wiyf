package com.wiyf.backendspring.service;

import com.wiyf.backendspring.dto.DetectionResponseDto;
import java.io.IOException;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DetectionProxyService {
    private final RestTemplate restTemplate;
    private final String aiServiceBaseUrl;

    public DetectionProxyService(RestTemplate restTemplate, @Value("${app.ai-service-url:http://127.0.0.1:8081}") String aiServiceBaseUrl) {
        this.restTemplate = restTemplate;
        this.aiServiceBaseUrl = aiServiceBaseUrl;
    }

    public DetectionResponseDto detect(MultipartFile file) {
        try {
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "scan.jpg";
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", resource);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            DetectionResponseDto response = restTemplate.postForObject(aiServiceBaseUrl + "/detect", request, DetectionResponseDto.class);
            return response != null ? response : new DetectionResponseDto(Collections.emptyList());
        } catch (IOException error) {
            throw new IllegalArgumentException("Unable to read uploaded image.", error);
        } catch (RestClientException error) {
            throw new IllegalStateException("AI service is unavailable.", error);
        }
    }
}
