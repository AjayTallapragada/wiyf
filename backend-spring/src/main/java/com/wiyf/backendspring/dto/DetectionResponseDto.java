package com.wiyf.backendspring.dto;

import java.util.ArrayList;
import java.util.List;

public class DetectionResponseDto {
    private List<DetectedIngredientDto> ingredients = new ArrayList<>();

    public DetectionResponseDto() {
    }

    public DetectionResponseDto(List<DetectedIngredientDto> ingredients) {
        this.ingredients = ingredients;
    }

    public List<DetectedIngredientDto> getIngredients() {
        return ingredients;
    }

    public void setIngredients(List<DetectedIngredientDto> ingredients) {
        this.ingredients = ingredients;
    }
}
