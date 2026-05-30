from ultralytics import YOLO
from pathlib import Path

model_path = Path('ai-service/third_party/Vegetable_Classification_And_Detection/best.pt')
image_path = Path('backend/test_tomato.png')
print('Model exists:', model_path.exists(), 'Size:', model_path.stat().st_size if model_path.exists() else None)
print('Image exists:', image_path.exists())

model = YOLO(str(model_path))
results = model.predict(source=str(image_path), conf=0.25, verbose=False)
for r in results:
    names = getattr(r, 'names', {}) or {}
    boxes = getattr(r, 'boxes', []) or []
    print('---- Result ----')
    print('names:', names)
    for box in boxes:
        conf = float(box.conf.item()) if hasattr(box.conf, 'item') else float(box.conf)
        cls = int(box.cls.item()) if hasattr(box.cls, 'item') else int(box.cls)
        print(f'class={cls} name={names.get(cls)} conf={conf}')
print('Done')
