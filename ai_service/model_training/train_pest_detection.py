"""
Pest Detection CNN — MobileNetV3-Small fine-tuned on IP102 / Pest24 dataset.

Usage:
    # 1. Download IP102 dataset:
    #    https://github.com/xpwu95/IP102
    #    Extract to: model_training/data/IP102/
    #    Expected structure: data/IP102/<class_name>/<image>.jpg

    # OR use Pest24 (smaller, easier to start):
    #    https://www.kaggle.com/datasets/gauravduttakiit/pest-dataset
    #    Extract to: model_training/data/pest24/

    python train_pest_detection.py \
        --data_dir  data/IP102 \
        --output    ../ai_scan_models/models/pest_mobilenet.onnx \
        --epochs    15 \
        --batch     32

Outputs:
    pest_mobilenet.onnx    → loaded by pest_detection.py via cv2.dnn
    pest_labels.json       → class index → pest name mapping
"""

import argparse
import json
import os
import sys

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms
from tqdm import tqdm


# ── IP102 class name → clean pest name ───────────────────────────────────────
# IP102 has 102 classes; map the most common ones to readable names.
# Any unmapped class will be title-cased automatically.
LABEL_REMAP = {
    # Rice pests
    "rice_leaf_roller":                 "Rice Leaf Roller",
    "rice_leaf_caterpillar":            "Rice Leaf Caterpillar",
    "paddy_stem_maggot":                "Paddy Stem Maggot",
    "asiatic_rice_borer":               "Asiatic Rice Borer",
    "yellow_rice_borer":                "Yellow Rice Borer",
    "rice_gall_midge":                  "Rice Gall Midge",
    "rice_stemfly":                     "Rice Stemfly",
    "brown_plant_hopper":               "Brown Plant Hopper",
    "white_backed_plant_hopper":        "White-Backed Plant Hopper",
    "small_brown_plant_hopper":         "Small Brown Plant Hopper",
    "rice_water_weevil":                "Rice Water Weevil",
    "rice_leafhopper":                  "Rice Leafhopper",
    "grain_spreader_thrips":            "Grain Spreader Thrips",
    "rice_shell_pest":                  "Rice Shell Pest",
    "grub":                             "Grub",
    "mole_cricket":                     "Mole Cricket",
    "wireworm":                         "Wireworm",
    "white_margined_moth":              "White Margined Moth",
    "black_cutworm":                    "Black Cutworm",
    "large_cutworm":                    "Large Cutworm",
    "yellow_cutworm":                   "Yellow Cutworm",
    "red_spider":                       "Red Spider Mite",
    "corn_borer":                       "Corn Borer",
    "army_worm":                        "Army Worm",
    "aphids":                           "Aphids",
    "potosiabre_vitarsis":              "Flower Chafer Beetle",
    "peach_borer":                      "Peach Borer",
    "english_grain_aphid":              "English Grain Aphid",
    "green_bug":                        "Green Bug",
    "bird_cherry-oat_aphid":            "Bird Cherry-Oat Aphid",
    "wheat_blossom_midge":              "Wheat Blossom Midge",
    "penthaleus_major":                 "Winter Grain Mite",
    "longlegged_spider_mite":           "Long-Legged Spider Mite",
    "wheat_phloeothrips":               "Wheat Phloeothrips",
    "wheat_sawfly":                     "Wheat Sawfly",
    "cerodonta_denticornis":            "Grass Fly",
    "beet_fly":                         "Beet Fly",
    "flea_beetle":                      "Flea Beetle",
    "cabbage_army_worm":                "Cabbage Army Worm",
    "beet_army_worm":                   "Beet Army Worm",
    "beet_weevil":                      "Beet Weevil",
    "sericaorient_alismots_chulsky":    "Oriental Beetle",
    "alfalfa_weevil":                   "Alfalfa Weevil",
    "flax_budworm":                     "Flax Budworm",
    "alfalfa_plant_bug":                "Alfalfa Plant Bug",
    "tarnished_plant_bug":              "Tarnished Plant Bug",
    "meadow_moth":                      "Meadow Moth",
    "beet_spot_flies":                  "Beet Spot Flies",
    "meadow_knotgrass_beetle":          "Meadow Knotgrass Beetle",
    "beet_aphid":                       "Beet Aphid",
    "field_cricket":                    "Field Cricket",
    "colorado_potato_beetle":           "Colorado Potato Beetle",
    "cotton_aphid":                     "Cotton Aphid",
    "western_flower_thrips":            "Western Flower Thrips",
    "cotton_bollworm":                  "Cotton Bollworm",
    "oriental_tobacco_budworm":         "Oriental Tobacco Budworm",
    "beet_armyworm":                    "Beet Armyworm",
    "fall_armyworm":                    "Fall Armyworm",
    "tobacco_cutworm":                  "Tobacco Cutworm",
    "whitefly":                         "Whitefly",
    "tobacco_thrips":                   "Tobacco Thrips",
    "tobacco_hornworm":                 "Tobacco Hornworm",
    "tobacco_budworm":                  "Tobacco Budworm",
}


def _clean_label(raw: str) -> str:
    """Convert folder name to readable pest name."""
    return LABEL_REMAP.get(raw.lower(), raw.replace("_", " ").title())


def build_transforms(img_size: int = 224):
    train_tf = transforms.Compose([
        transforms.Resize((img_size + 32, img_size + 32)),
        transforms.RandomCrop(img_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
        transforms.RandomRotation(20),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def load_datasets(data_dir: str, img_size: int = 224, val_split: float = 0.15):
    train_tf, val_tf = build_transforms(img_size)

    full_dataset = datasets.ImageFolder(data_dir, transform=train_tf)
    n_val   = int(len(full_dataset) * val_split)
    n_train = len(full_dataset) - n_val
    train_ds, val_ds = random_split(
        full_dataset, [n_train, n_val],
        generator=torch.Generator().manual_seed(42)
    )

    # Apply val transforms to val split
    val_ds.dataset = datasets.ImageFolder(data_dir, transform=val_tf)

    class_names = full_dataset.classes
    labels = [_clean_label(c) for c in class_names]

    return train_ds, val_ds, labels


def build_model(num_classes: int) -> nn.Module:
    """MobileNetV3-Small — fast inference, small ONNX (~10 MB)."""
    model = models.mobilenet_v3_small(
        weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1
    )
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in tqdm(loader, desc="  train", leave=False):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        correct    += (outputs.argmax(1) == labels).sum().item()
        total      += images.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0

    for images, labels in tqdm(loader, desc="  val  ", leave=False):
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)

        total_loss += loss.item() * images.size(0)
        correct    += (outputs.argmax(1) == labels).sum().item()
        total      += images.size(0)

    return total_loss / total, correct / total


def export_onnx(model: nn.Module, output_path: str, img_size: int = 224):
    model.eval()
    dummy = torch.randn(1, 3, img_size, img_size)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    torch.onnx.export(
        model,
        dummy,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=12,
    )
    print(f"ONNX model saved → {output_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="data/IP102")
    parser.add_argument("--output",   default="../ai_scan_models/models/pest_mobilenet.onnx")
    parser.add_argument("--epochs",   type=int,   default=15)
    parser.add_argument("--batch",    type=int,   default=32)
    parser.add_argument("--lr",       type=float, default=1e-3)
    parser.add_argument("--img_size", type=int,   default=224)
    args = parser.parse_args()

    if not os.path.isdir(args.data_dir):
        print(f"ERROR: data_dir '{args.data_dir}' not found.")
        print("Download IP102 from: https://github.com/xpwu95/IP102")
        print("Or Pest24 from: https://www.kaggle.com/datasets/gauravduttakiit/pest-dataset")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    print("Loading dataset...")
    train_ds, val_ds, labels = load_datasets(args.data_dir, args.img_size)
    print(f"  Train: {len(train_ds)} | Val: {len(val_ds)} | Classes: {len(labels)}")

    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True,
                              num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False,
                              num_workers=4, pin_memory=True)

    model     = build_model(len(labels)).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Phase 1: train head only (backbone frozen)
    for param in model.features.parameters():
        param.requires_grad = False

    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_acc = 0.0
    best_state   = None

    for epoch in range(1, args.epochs + 1):
        # Phase 2: unfreeze backbone after epoch 5
        if epoch == 6:
            for param in model.features.parameters():
                param.requires_grad = True
            optimizer = torch.optim.Adam(model.parameters(), lr=args.lr * 0.1)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=args.epochs - 5
            )

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss,   val_acc   = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{args.epochs}  "
            f"train_loss={train_loss:.4f}  train_acc={train_acc:.3f}  "
            f"val_loss={val_loss:.4f}  val_acc={val_acc:.3f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state   = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    print(f"\nBest val accuracy: {best_val_acc:.4f}")

    # Restore best weights and export
    model.load_state_dict(best_state)
    model.cpu()

    export_onnx(model, args.output, args.img_size)

    # Save label mapping
    labels_path = args.output.replace(".onnx", "_labels.json")
    with open(labels_path, "w") as f:
        json.dump(labels, f, indent=2)
    print(f"Labels saved → {labels_path}")

    # Also save as pest_labels.json for the default loader path
    pest_labels_path = os.path.join(os.path.dirname(args.output), "pest_labels.json")
    with open(pest_labels_path, "w") as f:
        json.dump(labels, f, indent=2)

    print("\nDone. Set these env vars before starting crop_scan_api:")
    print(f"  SCAN_PEST_MODEL_PATH={os.path.abspath(args.output)}")
    print(f"  SCAN_PEST_LABELS_PATH={os.path.abspath(labels_path)}")


if __name__ == "__main__":
    main()
