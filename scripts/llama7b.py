import os
from pathlib import Path
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from huggingface_hub import login
import logging
import tempfile
from datasets import load_dataset
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

# --- Configuration ---
MOUNTED_DIR = "~/AIServer"
MOUNTED_DIR = os.path.expanduser(MOUNTED_DIR)

TEMP_DIR = os.path.join(MOUNTED_DIR, "tmp")
MODEL_DIR = os.path.join(MOUNTED_DIR, "models")
DATASET_DIR = os.path.join(MOUNTED_DIR, "datasets")
TRAINING_DIR = os.path.join(MOUNTED_DIR, "training")

for path in [TEMP_DIR, MODEL_DIR, DATASET_DIR, TRAINING_DIR]:
    os.makedirs(path, exist_ok=True)

MODEL_NAME = "codellama/CodeLlama-7b-Instruct-hf"
DATASET_NAME = "codeparrot/github-code"
HUGGINGFACE_TOKEN = "YOUR-HF-TOKEN"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_gpu():
    """Check if an AMD GPU with ROCm is available."""
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        device_name = torch.cuda.get_device_name(0)
        logger.info(f"CUDA is available with {device_count} device(s): {device_name}")
        return torch.device("cuda")
    else:
        logger.warning("No compatible GPU found. Using CPU.")
    return torch.device("cpu")

def load_model_and_tokenizer():
    """Load model with AutoGPTQ for ROCm optimization."""
    logger.info(f"Loading model {MODEL_NAME} with AutoGPTQ optimization...")
    model_path = f"{MODEL_DIR}/{MODEL_NAME.replace('/', '_')}"
    device = check_gpu()
    try:
        quantize_config = BaseQuantizeConfig(
            bits=4,
            group_size=128,
            desc_act=False
        )
        model = AutoGPTQForCausalLM.from_pretrained(
            MODEL_NAME,
            quantize_config=quantize_config,
            cache_dir=model_path,
            use_safetensors=True,
            device_map="sequential"
        )
        model.to(device)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=model_path)
        return model, tokenizer
    except Exception as e:
        logger.error(f"Error loading model with AutoGPTQ: {e}")
        raise

def load_dataset_from_hub():
    """Load dataset using mounted storage and filter for specific programming languages."""
    logger.info(f"Loading dataset {DATASET_NAME}...")
    dataset_path = os.path.join(DATASET_DIR, DATASET_NAME.replace('/', '_'))
    os.makedirs(dataset_path, exist_ok=True)
    try:
        dataset = load_dataset(
            DATASET_NAME,
            split="train",
            trust_remote_code=True,
            cache_dir=dataset_path,
            token=HUGGINGFACE_TOKEN
        )
        languages_of_interest = {"Java", "Python", "HTML", "CSS", "JavaScript"}
        dataset = dataset.filter(lambda example: example.get("language") in languages_of_interest)
        return dataset
    except Exception as e:
        logger.error(f"Error loading dataset: {e}")
        raise

def train_model(model, tokenizer, dataset):
    """Train the model and save to mounted storage."""
    from transformers import TrainingArguments, Trainer
    logger.info("Setting up training...")
    device = check_gpu()
    model.to(device)
    training_args = TrainingArguments(
        output_dir=TRAINING_DIR,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        save_steps=1000,
        evaluation_strategy="steps",
        eval_steps=1000,
        save_total_limit=3,
        learning_rate=2e-5,
        num_train_epochs=2,
        fp16=True,
        logging_dir=os.path.join(TRAINING_DIR, "logs"),
        logging_steps=100,
        overwrite_output_dir=True
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset
    )
    logger.info("Starting training...")
    trainer.train()
    final_model_path = os.path.join(MOUNTED_DIR, "fine_tuned_model")
    model.save_pretrained(final_model_path)
    tokenizer.save_pretrained(final_model_path)
    logger.info("Training complete and model saved to mounted drive.")
    return model, tokenizer

def cleanup():
    """Clean up temporary files on mounted storage."""
    try:
        import shutil
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
        logger.info(f"Cleaned up temporary directory: {TEMP_DIR}")
    except Exception as e:
        logger.error(f"Error cleaning up: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true", help="Train the model")
    parser.add_argument("--serve", action="store_true", help="Run API server")
    args = parser.parse_args()
    try:
        os.environ["PYTORCH_HIP_ALLOC_CONF"] = "expandable_segments:True"
        login(token=HUGGINGFACE_TOKEN)
        model, tokenizer = load_model_and_tokenizer()
        dataset = load_dataset_from_hub()
        if args.train:
            model, tokenizer = train_model(model, tokenizer, dataset)
        if args.serve:
            from fastapi import FastAPI
            import uvicorn
            from transformers import pipeline
            app = FastAPI()
            @app.get("/generate")
            def get_code(prompt: str):
                pipe = pipeline("text-generation", model=model, tokenizer=tokenizer, device=0)
                output = pipe(prompt, max_length=256, temperature=0.7, do_sample=True)
                return {"response": output[0]["generated_text"]}
            uvicorn.run(app, host="0.0.0.0", port=8000)
        logger.info("Script completed successfully.")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        cleanup()
