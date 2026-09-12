"""
Whisper Fine-Tuning Script for Bible Accent Training
=====================================================
Fine-tunes OpenAI Whisper (tiny or small) on audio recordings of your
congregation reading Bible passages. After training, the model will
recognise Bible book names with your accent far more accurately.

REQUIREMENTS (run on Google Colab or a machine with a GPU):
  pip install transformers datasets soundfile librosa evaluate jiwer
  pip install accelerate -U

SETUP:
  1. Record 5-10 people from your church reading Bible passages aloud.
     Aim for 15-30 minutes of audio total. Include:
       - All 66 book names spoken clearly
       - Common passages: John 3:16, Psalm 23, 1 Cor 13:4-7, etc.
       - Different accents within your congregation
  2. Save as .wav files (16kHz mono) in a folder called `audio/`
  3. Create `transcripts.csv` with columns: file, text
       audio/john.wav,"John chapter three verse sixteen"
       audio/psalm23.wav,"Psalm twenty three"
  4. Run: python scripts/train-whisper-bible.py
  5. Fine-tuned model saved to `models/whisper-bible/`

HOW TO USE THE TRAINED MODEL IN THE APP:
  - Export to ONNX: python scripts/train-whisper-bible.py --export
  - The ONNX model can then be loaded via @huggingface/transformers in
    a Next.js Web Worker for offline browser-side inference.
"""

import argparse
import csv
import json
import os
from pathlib import Path

import torch
import numpy as np

try:
    import soundfile as sf
    import librosa
    from transformers import (
        WhisperProcessor,
        WhisperForConditionalGeneration,
        Seq2SeqTrainingArguments,
        Seq2SeqTrainer,
    )
    from datasets import Dataset, Audio
    import evaluate
except ImportError:
    print("Missing dependencies. Run:")
    print("  pip install transformers datasets soundfile librosa evaluate jiwer accelerate")
    raise

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_NAME = "openai/whisper-tiny"     # or "openai/whisper-small" for better accuracy
OUTPUT_DIR = "models/whisper-bible"
AUDIO_DIR = "audio"
TRANSCRIPT_CSV = "transcripts.csv"
SAMPLE_RATE = 16_000
MAX_AUDIO_LEN = 30   # seconds

# ---------------------------------------------------------------------------
# Bible-specific vocabulary hints (biases the model toward Bible book names)
# ---------------------------------------------------------------------------
BIBLE_VOCAB_HINTS = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "Samuel", "Kings", "Chronicles",
    "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Psalm",
    "Proverbs", "Ecclesiastes", "Isaiah", "Jeremiah", "Lamentations",
    "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah",
    "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
    "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John",
    "Acts", "Romans", "Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "Thessalonians", "Timothy", "Titus",
    "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation",
    "chapter", "verse", "first", "second", "third",
]


def load_dataset_from_csv(csv_path: str, audio_dir: str):
    """Loads audio + transcript pairs from a CSV file."""
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            audio_path = os.path.join(audio_dir, row.get("file", "").strip())
            text = row.get("text", "").strip()
            if os.path.exists(audio_path) and text:
                rows.append({"audio": audio_path, "text": text})

    if not rows:
        raise ValueError(
            f"No valid audio-transcript pairs found.\n"
            f"Check that {csv_path} exists and audio files are in {audio_dir}/"
        )

    print(f"Loaded {len(rows)} training examples.")
    return rows


def load_audio(path: str) -> np.ndarray:
    """Load audio file and resample to 16kHz mono."""
    audio, sr = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    max_samples = MAX_AUDIO_LEN * SAMPLE_RATE
    return audio[:max_samples]


def prepare_features(batch, processor):
    """Convert audio + text to model input features."""
    audio_arrays = [load_audio(p) for p in batch["audio"]]
    inputs = processor(
        audio_arrays,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )
    labels = processor.tokenizer(
        batch["text"],
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=448,
    ).input_ids
    batch["input_features"] = inputs.input_features
    batch["labels"] = labels
    return batch


def compute_wer(pred, processor):
    """Word error rate metric — lower is better. Target: < 5% on Bible references."""
    wer_metric = evaluate.load("wer")
    pred_ids = pred.predictions
    label_ids = pred.label_ids
    label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
    pred_str = processor.batch_decode(pred_ids, skip_special_tokens=True)
    label_str = processor.batch_decode(label_ids, skip_special_tokens=True)
    return {"wer": wer_metric.compute(predictions=pred_str, references=label_str)}


def train(args):
    print(f"\n{'='*60}")
    print("  Bible Whisper Fine-Tuning")
    print(f"  Base model : {MODEL_NAME}")
    print(f"  Output     : {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    # Load processor and model
    processor = WhisperProcessor.from_pretrained(MODEL_NAME, language="English", task="transcribe")
    model = WhisperForConditionalGeneration.from_pretrained(MODEL_NAME)
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []

    # Bias decoder toward Bible vocabulary
    print("Adding Bible vocabulary hints to tokenizer...")
    added = processor.tokenizer.add_tokens(
        [t for t in BIBLE_VOCAB_HINTS if t not in processor.tokenizer.get_vocab()]
    )
    if added:
        model.resize_token_embeddings(len(processor.tokenizer))
        print(f"  Added {added} new tokens.")

    # Load data
    rows = load_dataset_from_csv(TRANSCRIPT_CSV, AUDIO_DIR)
    dataset = Dataset.from_list(rows)

    # Split train/eval (80/20)
    split = dataset.train_test_split(test_size=0.2, seed=42)
    train_ds = split["train"]
    eval_ds = split["test"]
    print(f"Train: {len(train_ds)} | Eval: {len(eval_ds)}\n")

    # Prepare features (process in batches)
    train_ds = train_ds.map(
        lambda b: prepare_features(b, processor),
        batched=True, batch_size=4, remove_columns=["audio", "text"]
    )
    eval_ds = eval_ds.map(
        lambda b: prepare_features(b, processor),
        batched=True, batch_size=4, remove_columns=["audio", "text"]
    )

    # Training arguments
    training_args = Seq2SeqTrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=2,
        learning_rate=1e-5,
        warmup_steps=50,
        max_steps=500,             # increase to 1000+ for more data
        gradient_checkpointing=True,
        fp16=torch.cuda.is_available(),
        evaluation_strategy="steps",
        per_device_eval_batch_size=4,
        predict_with_generate=True,
        generation_max_length=225,
        save_steps=100,
        eval_steps=100,
        logging_steps=25,
        report_to=["none"],
        load_best_model_at_end=True,
        metric_for_best_model="wer",
        greater_is_better=False,
        push_to_hub=False,
    )

    trainer = Seq2SeqTrainer(
        args=training_args,
        model=model,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        tokenizer=processor.feature_extractor,
        compute_metrics=lambda p: compute_wer(p, processor),
    )

    print("Starting training...")
    trainer.train()

    print(f"\nSaving model to {OUTPUT_DIR}/...")
    trainer.save_model(OUTPUT_DIR)
    processor.save_pretrained(OUTPUT_DIR)

    # Save mishearing map from JSON export (if provided)
    if args.mishearings and os.path.exists(args.mishearings):
        with open(args.mishearings) as f:
            mishearings = json.load(f)
        out_path = os.path.join(OUTPUT_DIR, "mishearings.json")
        with open(out_path, "w") as f:
            json.dump(mishearings, f, indent=2)
        print(f"Saved {len(mishearings)} mishearing entries to {out_path}")

    print("\n✨ Training complete!")
    print(f"Model saved to: {OUTPUT_DIR}/")
    print("\nNext step — export to ONNX for browser use:")
    print(f"  python scripts/train-whisper-bible.py --export")


def export_onnx():
    """Export the fine-tuned model to ONNX for browser inference."""
    try:
        from optimum.exporters.onnx import main_export
    except ImportError:
        print("Install optimum: pip install optimum[exporters]")
        return

    onnx_dir = os.path.join(OUTPUT_DIR, "onnx")
    print(f"Exporting to ONNX: {onnx_dir}/")
    main_export(
        model_name_or_path=OUTPUT_DIR,
        output=onnx_dir,
        task="automatic-speech-recognition-with-past",
        opset=17,
        device="cpu",
    )
    print(f"✨ ONNX model exported to {onnx_dir}/")
    print("Load it in Next.js with @huggingface/transformers pointing to this directory.")


def generate_sample_csv():
    """Generates a sample transcripts.csv to help get started."""
    sample = [
        ["file", "text"],
        ["audio/genesis.wav", "Genesis chapter one verse one"],
        ["audio/john316.wav", "John chapter three verse sixteen"],
        ["audio/psalm23.wav", "Psalm twenty three"],
        ["audio/1cor13.wav", "First Corinthians chapter thirteen verse four"],
        ["audio/rev320.wav", "Revelation chapter three verse twenty"],
        ["audio/philippians.wav", "Philippians chapter four verse thirteen"],
    ]
    with open("transcripts.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(sample)
    print("Generated sample transcripts.csv — fill in your actual recordings.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Whisper Bible Fine-Tuning")
    parser.add_argument("--export", action="store_true", help="Export trained model to ONNX")
    parser.add_argument("--sample-csv", action="store_true", help="Generate sample transcripts.csv")
    parser.add_argument("--mishearings", type=str, help="Path to mishearings JSON export from the app")
    args = parser.parse_args()

    if args.sample_csv:
        generate_sample_csv()
    elif args.export:
        export_onnx()
    else:
        train(args)
