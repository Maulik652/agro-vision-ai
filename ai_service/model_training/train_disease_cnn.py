"""
Crop Disease CNN — MobileNetV3-Small fine-tuned on PlantVillage.

Usage:
    # 1. Download dataset from Kaggle:
    #    https://www.kaggle.com/datasets/emmarex/plantdisease
    #    Extract to: model_training/data/PlantVillage/

    python train_disease_cnn.py \
        --data_dir  data/PlantVillage \
        --output    ../ai_scan_models/models/disease_mobilenet.onnx \
        --epochs    15 \
        --batch     32

Outputs:
    disease_mobilenet.onnx   → loaded by cnn_disease_model.py via cv2.dnn
    disease_labels.json      → class index → disease name mapping
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


# ── PlantVillage class name → clean disease name ─────────────────────────────
LABEL_REMAP = {
    "Tomato___Early_blight":                    "Early Blight",
    "Tomato___Late_blight":                     "Late Blight",
    "Tomato___Leaf_Mold":                       "Leaf Mold",
    "Tomato___Septoria_leaf_spot":              "Septoria Leaf Spot",
    "Tomato___Spider_mites Two-spotted_spider_mite": "Spider Mites",
    "Tomato___Target_Spot":                     "Target Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus":   "Yellow Leaf Curl Virus",
    "Tomato___Tomato_mosaic_virus":             "Mosaic Virus",
    "Tomato___Bacterial_spot":                  "Bacterial Spot",
    "Tomato___healthy":                         "Healthy Leaf",
    "Potato___Early_blight":                    "Early Blight",
    "Potato___Late_blight":                     "Late Blight",
    "Potato___healthy":                         "Healthy Leaf",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "Gray Leaf Spot",
    "Corn_(maize)___Common_rust_":              "Common Rust",
    "Corn_(maize)___Northern_Leaf_Blight":      "Northern Leaf Blight",
    "Corn_(maize)___healthy":                   "Healthy Leaf",
    "Grape___Black_rot":                        "Black Rot",
    "Grape___Esca_(Black_Measles)":             "Black Measles",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": "Leaf Blight",
    "Grape___healthy":                          "Healthy Leaf",
    "Rice___Brown_spot":                        "Brown Spot",
    "Rice___Leaf_blast":                        "Leaf Blast",
    "Rice___Neck_blast":                        "Neck Blast",
    "Wheat___Yellow_Rust_Stripe_Rust":          "Yellow Rust",
    "Wheat___Brown_Rust":                       "Brown Rust",
    "Wheat___healthy":                          "Healthy Leaf",
}


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
    n_val = int(len(full_dataset) * val_split)
    n_train = len(full_dataset) - n_val
    train_ds, val_ds = random_split(full_dataset, [n_train, n_val],
                                    generator=torch.Generator().manual_seed(42))

    # Apply val transforms to val split
    val_ds.dataset = datasets.ImageFolder(data_dir, transform=val_tf)

    class_names = full_dataset.classes
    labels = [LABEL_REMAP.get(c, c.replace("_", " ").title()) for c in class_names]

    return train_ds, val_ds, labels


def build_model(num_classes: int) -> nn.Module:
    """MobileNetV3-Small — fast inference, small ONNX file (~10 MB)."""
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)

    # Replace classifier head for our number of classes
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
        correct += (outputs.argmax(1) == labels).sum().item()
        total += images.size(0)

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
        correct += (outputs.argmax(1) == labels).sum().item()
        total += images.size(0)

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
    parser.add_argument("--data_dir", default="data/PlantVillage")
    parser.add_argument("--output",   default="../ai_scan_models/models/disease_mobilenet.onnx")
    parser.add_argument("--epochs",   type=int, default=15)
    parser.add_argument("--batch",    type=int, default=32)
    parser.add_argument("--lr",       type=float, default=1e-3)
    parser.add_argument("--img_size", type=int, default=224)
    args = parser.parse_args()

    if not os.path.isdir(args.data_dir):
        print(f"ERROR: data_dir '{args.data_dir}' not found.")
        print("Download PlantVillage from https://www.kaggle.com/datasets/emmarex/plantdisease")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    print("Loading dataset...")
    train_ds, val_ds, labels = load_datasets(args.data_dir, args.img_size)
    print(f"  Train: {len(train_ds)} | Val: {len(val_ds)} | Classes: {len(labels)}")

    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True,  num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False, num_workers=4, pin_memory=True)

    model = build_model(len(labels)).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    # Two-phase training: head only → then full fine-tune
    for param in model.features.parameters():
        param.requires_grad = False

    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_acc = 0.0
    best_state = None

    for epoch in range(1, args.epochs + 1):
        # Unfreeze backbone after epoch 5
        if epoch == 6:
            for param in model.features.parameters():
                param.requires_grad = True
            optimizer = torch.optim.Adam(model.parameters(), lr=args.lr * 0.1)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs - 5)

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc     = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        print(f"Epoch {epoch:02d}/{args.epochs}  "
              f"train_loss={train_loss:.4f}  train_acc={train_acc:.3f}  "
              f"val_loss={val_loss:.4f}  val_acc={val_acc:.3f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    print(f"\nBest val accuracy: {best_val_acc:.4f}")

    # Restore best weights and export
    model.load_state_dict(best_state)
    model.cpu()

    export_onnx(model, args.output, args.img_size)

    # Save label mapping alongside the ONNX file
    labels_path = args.output.replace(".onnx", "_labels.json")
    with open(labels_path, "w") as f:
        json.dump(labels, f, indent=2)
    print(f"Labels saved → {labels_path}")

    # Also save to the path cnn_disease_model.py reads by default
    env_labels_path = os.path.join(os.path.dirname(args.output), "disease_labels.json")
    with open(env_labels_path, "w") as f:
        json.dump(labels, f, indent=2)

    print("\nDone. Set these env vars before starting crop_scan_api:")
    print(f"  SCAN_DISEASE_MODEL_PATH={os.path.abspath(args.output)}")
    print(f"  SCAN_DISEASE_LABELS_PATH={os.path.abspath(labels_path)}")


if __name__ == "__main__":
    main()
