import os
import json
import shutil
import random
from pathlib import Path

random.seed(42)

# ===== 경로 설정 =====
BASE_DIR = Path("/Volumes/Samsung USB/073.노지_작물_질병_진단/01.데이터/1.Training")

LABEL_CABBAGE_DIR = BASE_DIR / "라벨링데이터" / "03.배추"
IMAGE_CABBAGE_DIR = BASE_DIR / "원천데이터" / "03.배추"

OUTPUT_DIR = Path("/Users/jun8ha/smartfarm-backend/ai/dataset")

# ===== 샘플 개수 =====
NORMAL_COUNT = 100
DISEASE_COUNT = 100

# ===== train/val 비율 =====
TRAIN_RATIO = 0.8


def reset_output_dirs():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)

    for split in ["train", "val"]:
        for cls in ["healthy", "disease"]:
            (OUTPUT_DIR / split / cls).mkdir(parents=True, exist_ok=True)


def is_json_file(filename: str) -> bool:
    return filename.lower().endswith(".json")


def is_image_file(filename: str) -> bool:
    lower = filename.lower()
    return lower.endswith(".jpg") or lower.endswith(".jpeg") or lower.endswith(".png")


def find_matching_image(json_filename: str, image_dir: Path):
    stem = json_filename[:-5]  # remove .json
    candidates = [
        image_dir / f"{stem}.jpg",
        image_dir / f"{stem}.JPG",
        image_dir / f"{stem}.jpeg",
        image_dir / f"{stem}.JPEG",
        image_dir / f"{stem}.png",
        image_dir / f"{stem}.PNG",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def load_pairs():
    healthy_pairs = []
    disease_pairs = []

    json_files = [f for f in os.listdir(LABEL_CABBAGE_DIR) if is_json_file(f)]

    for json_name in json_files:
        json_path = LABEL_CABBAGE_DIR / json_name
        image_path = find_matching_image(json_name, IMAGE_CABBAGE_DIR)

        if image_path is None:
            continue

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue

        disease_info = str(data.get("disease", "")).strip()

        pair = {
            "json_path": json_path,
            "image_path": image_path,
            "json_name": json_name,
            "image_name": image_path.name,
        }

        if disease_info == "정상":
            healthy_pairs.append(pair)
        else:
            disease_pairs.append(pair)

    return healthy_pairs, disease_pairs


def split_and_copy(pairs, class_name: str):
    random.shuffle(pairs)

    train_count = int(len(pairs) * TRAIN_RATIO)
    train_pairs = pairs[:train_count]
    val_pairs = pairs[train_count:]

    for pair in train_pairs:
        shutil.copy2(pair["image_path"], OUTPUT_DIR / "train" / class_name / pair["image_name"])
        shutil.copy2(pair["json_path"], OUTPUT_DIR / "train" / class_name / pair["json_name"])

    for pair in val_pairs:
        shutil.copy2(pair["image_path"], OUTPUT_DIR / "val" / class_name / pair["image_name"])
        shutil.copy2(pair["json_path"], OUTPUT_DIR / "val" / class_name / pair["json_name"])


def main():
    reset_output_dirs()

    healthy_pairs, disease_pairs = load_pairs()

    print(f"정상 후보 수: {len(healthy_pairs)}")
    print(f"질병 후보 수: {len(disease_pairs)}")

    if len(healthy_pairs) < NORMAL_COUNT:
        raise ValueError(f"정상 데이터가 부족함: {len(healthy_pairs)}개")
    if len(disease_pairs) < DISEASE_COUNT:
        raise ValueError(f"질병 데이터가 부족함: {len(disease_pairs)}개")

    selected_healthy = random.sample(healthy_pairs, NORMAL_COUNT)
    selected_disease = random.sample(disease_pairs, DISEASE_COUNT)

    split_and_copy(selected_healthy, "healthy")
    split_and_copy(selected_disease, "disease")

    print("완료")
    print(f"생성 위치: {OUTPUT_DIR}")
    print("train/healthy, train/disease, val/healthy, val/disease 확인해봐")


if __name__ == "__main__":
    main()
