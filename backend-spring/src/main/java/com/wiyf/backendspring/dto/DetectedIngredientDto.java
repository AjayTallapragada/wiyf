package com.wiyf.backendspring.dto;

public class DetectedIngredientDto {
    private String name;
    private double confidence;
    private String category;

    public DetectedIngredientDto() {
    }

    public DetectedIngredientDto(String name, double confidence, String category) {
        this.name = name;
        this.confidence = confidence;
        this.category = category;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
