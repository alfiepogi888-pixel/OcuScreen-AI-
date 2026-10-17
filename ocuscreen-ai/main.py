"""Optional command-line entrypoint: python main.py path/to/eye.jpg."""

import argparse
import json
from pathlib import Path
from backend.image_predictor import predict_image


def main():
    parser = argparse.ArgumentParser(description="OcuScreen image inference")
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(predict_image(args.image.read_bytes()), ensure_ascii=False, indent=2)
    )


if __name__ == "__main__":
    main()
