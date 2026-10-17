"""Transparent prototype rules. No trained disease probabilities."""

import json
from pathlib import Path

KB = json.loads(
    (Path(__file__).resolve().parents[1] / "data/disease_knowledge.json").read_text(
        encoding="utf-8"
    )
)
SYMPTOMS = {s["id"]: s for s in KB["symptoms"]}
URGENT_SYMPTOMS = frozenset(KB["urgent_symptoms"])
COMBINATIONS = [
    (rule, frozenset(rule["all_symptoms"])) for rule in KB["urgent_combinations"]
]
DISEASES = [(disease, frozenset(disease["symptoms"])) for disease in KB["diseases"]]


def assess_risk(prediction, symptom_ids):
    selected = set(symptom_ids)
    if selected - SYMPTOMS.keys():
        raise ValueError("Có mã triệu chứng không hợp lệ.")
    sign = prediction["label"] if prediction["status"] == "valid" else None
    reasons = []
    high = selected & URGENT_SYMPTOMS
    for sid in sorted(high):
        reasons.append(SYMPTOMS[sid]["label"])
    for rule, required in COMBINATIONS:
        if required <= selected and (
            not rule["image_signs"] or sign in rule["image_signs"]
        ):
            high.add(rule["id"])
            reasons.append(rule["reason"])
    image_rule = KB["image_signs"].get(sign, {})
    level = (
        "Cao"
        if high
        else ("Vừa" if selected or (sign and sign != "Normal") else "Thấp")
    )
    if not high and prediction["status"] != "valid" and not selected:
        level = None
    if image_rule.get("priority") == "high":
        level = "Cao"
        reasons.append(image_rule["description"])
    candidates = []
    for disease, symptoms in DISEASES:
        matches = sorted(selected & symptoms)
        image_match = sign in disease["image_signs"]
        if not matches and not image_match:
            continue
        candidates.append(
            {
                "name": disease["name"],
                "match_points": len(matches) + 2 * int(image_match),
                "matched_symptoms": [SYMPTOMS[s]["label"] for s in matches],
                "matched_image_sign": sign if image_match else None,
                "note": disease["note"],
            }
        )
    candidates.sort(key=lambda d: (-d["match_points"], d["name"]))
    if high:
        advice = "Đến cơ sở y tế hoặc chuyên khoa mắt ngay để được đánh giá. Không chờ chụp lại ảnh hay kết quả AI."
    elif level == "Cao":
        advice = "Cần được bác sĩ đánh giá sớm, ưu tiên trong ngày. Nếu đau nhiều hoặc giảm thị lực, đi khám ngay."
    elif level == "Vừa":
        advice = "Sắp xếp khám mắt nếu triệu chứng còn tiếp diễn, tái phát hoặc tăng lên. Nếu xuất hiện đau nhiều hay thay đổi thị lực, đi khám ngay."
    elif level == "Thấp":
        advice = "Chưa ghi nhận dấu hiệu ưu tiên từ thông tin đã nhập. Điều này không loại trừ bệnh mắt; khám nếu có khó chịu hoặc lo lắng."
    else:
        advice = "Chưa đủ thông tin để phân loại. Hãy chụp lại ảnh mắt và kiểm tra checklist triệu chứng."
    return {
        "level": level,
        "label": level or "Chưa đánh giá",
        "urgent": bool(high),
        "reasons": reasons,
        "recommendation": advice,
        "candidates": candidates[:3],
        "image_used": sign is not None,
        "knowledge_version": KB["version"],
        "disclaimer": KB["disclaimer"],
    }
