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

# `level` stays Vietnamese in the response (the frontend keys its colors on it);
# only the human-readable text is translated.
LEVEL_LABELS_EN = {"Cao": "High", "Vừa": "Medium", "Thấp": "Low"}
UNKNOWN_SYMPTOM = {
    "vi": "Có mã triệu chứng không hợp lệ.",
    "en": "Invalid symptom code.",
}
ADVICE = {
    "urgent": {
        "vi": "Đến cơ sở y tế hoặc chuyên khoa mắt ngay để được đánh giá. Không chờ chụp lại ảnh hay kết quả AI.",
        "en": "Go to a medical facility or an eye specialist right away for evaluation. Do not wait to retake the photo or for the AI result.",
    },
    "Cao": {
        "vi": "Cần được bác sĩ đánh giá sớm, ưu tiên trong ngày. Nếu đau nhiều hoặc giảm thị lực, đi khám ngay.",
        "en": "You need to be seen by a doctor soon, ideally the same day. If you have significant pain or reduced vision, go immediately.",
    },
    "Vừa": {
        "vi": "Sắp xếp khám mắt nếu triệu chứng còn tiếp diễn, tái phát hoặc tăng lên. Nếu xuất hiện đau nhiều hay thay đổi thị lực, đi khám ngay.",
        "en": "Arrange an eye exam if symptoms continue, recur, or get worse. If you develop significant pain or a change in vision, go immediately.",
    },
    "Thấp": {
        "vi": "Chưa ghi nhận dấu hiệu ưu tiên từ thông tin đã nhập. Điều này không loại trừ bệnh mắt; khám nếu có khó chịu hoặc lo lắng.",
        "en": "No priority signs were recorded from the information entered. This does not rule out an eye condition; see a doctor if you have discomfort or concerns.",
    },
    None: {
        "vi": "Chưa đủ thông tin để phân loại. Hãy chụp lại ảnh mắt và kiểm tra checklist triệu chứng.",
        "en": "Not enough information to classify. Retake the eye photo and check the symptom checklist.",
    },
}


def tr(item, key, lang):
    """Text of `key` in the requested language, falling back to Vietnamese."""
    if lang == "en":
        return item.get(f"{key}_en") or item[key]
    return item[key]


def symptoms_payload(lang="vi"):
    lang = "en" if lang == "en" else "vi"
    return {
        "symptoms": [
            {"id": s["id"], "label": tr(s, "label", lang)} for s in KB["symptoms"]
        ],
        "urgent_symptoms": KB["urgent_symptoms"],
        "urgent_combinations": KB["urgent_combinations"],
        "disclaimer": tr(KB, "disclaimer", lang),
    }


def assess_risk(prediction, symptom_ids, lang="vi"):
    lang = "en" if lang == "en" else "vi"
    selected = set(symptom_ids)
    if selected - SYMPTOMS.keys():
        raise ValueError(UNKNOWN_SYMPTOM[lang])
    sign = prediction["label"] if prediction["status"] == "valid" else None
    reasons = []
    high = selected & URGENT_SYMPTOMS
    for sid in sorted(high):
        reasons.append(tr(SYMPTOMS[sid], "label", lang))
    for rule, required in COMBINATIONS:
        if required <= selected and (
            not rule["image_signs"] or sign in rule["image_signs"]
        ):
            high.add(rule["id"])
            reasons.append(tr(rule, "reason", lang))
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
        reasons.append(tr(image_rule, "description", lang))
    candidates = []
    for disease, symptoms in DISEASES:
        matches = sorted(selected & symptoms)
        image_match = sign in disease["image_signs"]
        if not matches and not image_match:
            continue
        candidates.append(
            {
                "name": tr(disease, "name", lang),
                "match_points": len(matches) + 2 * int(image_match),
                "matched_symptoms": [
                    tr(SYMPTOMS[s], "label", lang) for s in matches
                ],
                "matched_image_sign": sign if image_match else None,
                "note": tr(disease, "note", lang),
            }
        )
    candidates.sort(key=lambda d: (-d["match_points"], d["name"]))
    advice = ADVICE["urgent" if high else level][lang]
    if lang == "en":
        label = LEVEL_LABELS_EN.get(level, "Not assessed")
    else:
        label = level or "Chưa đánh giá"
    return {
        "level": level,
        "label": label,
        "urgent": bool(high),
        "reasons": reasons,
        "recommendation": advice,
        "candidates": candidates[:3],
        "image_used": sign is not None,
        "knowledge_version": KB["version"],
        "disclaimer": tr(KB, "disclaimer", lang),
    }