from typing import Dict, Set

from app.models.schemas import Category

YOLO_CLASS_MAP: Dict[str, str] = {
    "tomato": "tomato",
    "tomatoes": "tomato",
    "roma tomato": "tomato",
    "cherry tomato": "tomato",
    "potato": "potato",
    "potatoes": "potato",
    "onion": "onion",
    "red onion": "onion",
    "yellow onion": "onion",
    "cucumber": "cucumber",
    "cucumbers": "cucumber",
    "carrot": "carrot",
    "carrots": "carrot",
    "eggplant": "eggplant",
    "brinjal": "eggplant",
    "aubergine": "eggplant",
    "capsicum": "pepper",
    "bell pepper": "pepper",
    "pepper": "pepper",
    "broccoli": "broccoli",
    "cauliflower": "cauliflower",
    "cabbage": "cabbage",
    "lettuce": "lettuce",
    "spinach": "spinach",
    "mushroom": "mushroom",
    "mushrooms": "mushroom",
    "garlic": "garlic",
    "ginger": "ginger",
    "okra": "okra",
    "lady finger": "okra",
    "ladies finger": "okra",
    "egg": "egg",
    "eggs": "egg",
    "milk": "milk",
    "rice": "rice",
    "bread": "bread",
    "apple": "apple",
    "banana": "banana",
    "orange": "orange",
    "lemon": "lemon",
    "lime": "lime",
    "grape": "grape",
    "grapes": "grape",
    "chili": "chili",
    "chilli": "chili",
    "green chilli": "chili",
    "red chilli": "chili",
    "spring onion": "spring onion",
    "scallion": "spring onion",
    "coriander": "coriander",
    "cilantro": "coriander",
}

ALIASES = {
    "roma tomato": "tomato",
    "cherry tomato": "tomato",
    "red onion": "onion",
    "yellow onion": "onion",
    "bell pepper": "pepper",
    "capsicum": "pepper",
    "scallion": "spring onion",
    "cilantro": "coriander",
    "cottage cheese": "paneer",
    "curd": "yogurt",
    "yoghurt": "yogurt",
    "aubergine": "eggplant",
    "brinjal": "eggplant",
    "lady finger": "okra",
    "ladies finger": "okra",
    "green chilli": "chili",
    "red chilli": "chili",
    "chili pepper": "chili",
    "sweet corn": "corn",
    "green pea": "peas",
    "garden pea": "peas",
    "garbanzo": "chickpea",
    "garbanzo bean": "chickpea",
    "kidney bean": "bean",
    "green bean": "bean",
    "french bean": "bean",
    "button mushroom": "mushroom",
    "sweet potato": "sweet potato",
    "cucumber": "cucumber",
    "zucchini": "zucchini",
    "beetroot": "beet",
    "beet root": "beet",
    "water melon": "watermelon",
    "straw berry": "strawberry",
    "blue berry": "blueberry",
    "black berry": "blackberry",
    "pine apple": "pineapple",
}

CATEGORY_KEYWORDS: Dict[Category, Set[str]] = {
    "vegetable": {
        "tomato",
        "onion",
        "potato",
        "sweet potato",
        "carrot",
        "pepper",
        "chili",
        "spinach",
        "broccoli",
        "cabbage",
        "cauliflower",
        "eggplant",
        "okra",
        "peas",
        "corn",
        "mushroom",
        "cucumber",
        "zucchini",
        "beet",
        "radish",
        "lettuce",
        "celery",
        "pumpkin",
        "squash",
        "gourd",
    },
    "fruit": {
        "apple",
        "banana",
        "orange",
        "mango",
        "grape",
        "berry",
        "strawberry",
        "blueberry",
        "blackberry",
        "lemon",
        "lime",
        "avocado",
        "watermelon",
        "melon",
        "papaya",
        "pineapple",
        "kiwi",
        "pear",
        "peach",
        "plum",
        "pomegranate",
        "guava",
    },
    "dairy": {"milk", "cheese", "paneer", "yogurt", "butter", "cream"},
    "protein": {"egg", "chicken", "fish", "tofu", "paneer", "lentil", "bean", "chickpea", "meat", "turkey"},
    "grain": {"rice", "bread", "oats", "pasta", "flour", "quinoa"},
    "beverage": {"juice", "soda", "water", "tea", "coffee"},
    "packaged": {"sauce", "ketchup", "jam", "pickle", "can", "packet"},
    "herb": {"coriander", "parsley", "mint", "basil", "thyme"},
    "other": set(),
}

INGREDIENT_KEYWORDS = sorted(
    {keyword for keywords in CATEGORY_KEYWORDS.values() for keyword in keywords if keyword}
    | set(ALIASES.values())
    | set(YOLO_CLASS_MAP.values())
    | {"soy bean", "ginger", "garlic"},
    key=len,
    reverse=True,
)


def normalize_yolo_label(label: str) -> str:
    clean = " ".join(label.lower().replace("_", " ").replace("-", " ").replace(",", " ").split())
    return YOLO_CLASS_MAP.get(clean, clean)


def normalize_name(label: str) -> str:
    clean = normalize_yolo_label(label)
    # removeprefix is Python 3.9+; use startswith slicing for 3.8 compatibility
    prefixes = ("fresh ", "ripe ", "raw ")
    stripped = True
    while stripped:
        stripped = False
        for p in prefixes:
            if clean.startswith(p):
                clean = clean[len(p):]
                stripped = True
                break
    clean = ALIASES.get(clean, clean)
    if clean.endswith("ies") and len(clean) > 4:
        clean = f"{clean[:-3]}y"
    elif clean.endswith("oes") and len(clean) > 4:
        clean = clean[:-2]
    elif clean.endswith("s") and not clean.endswith("ss") and len(clean) > 3:
        clean = clean[:-1]
    clean = ALIASES.get(clean, clean)
    words = set(clean.split())
    for keyword in INGREDIENT_KEYWORDS:
        if keyword in clean and (keyword in words or " " in keyword):
            return ALIASES.get(keyword, keyword)
    return clean


def categorize(name: str) -> Category:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in name for keyword in keywords):
            return category
    return "other"
