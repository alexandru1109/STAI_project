import sys
import os
import torch
import math
from tqdm import tqdm
import psutil

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from STAI_project.utils.global_settings import PATHS, MODEL_CONFIG
from STAI_project.utils.logger import ProjectLogger
from STAI_project.dataset.dataloader import get_dataloader
from STAI_project.model.model import RoBERTaCausalLM

def evaluate(model_path=None):
    logger = ProjectLogger(log_file="eval.log")
    print(f"\n{'='*50}\n🔍 INIT: Model Evaluation Pipeline\n{'='*50}")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    print("[Data] Loading validation dataset...")
    val_loader = get_dataloader("val")
    
    print("[Model] Initializing Model...")
    model = RoBERTaCausalLM(MODEL_CONFIG).to(device)
    
    if model_path is None:
        model_path = os.path.join(PATHS["model_save"], "roberta_causal_lm_final.pt")
        
    if not os.path.exists(model_path):
        print(f"❌ ERROR: Model path {model_path} does not exist.")
        return
        
    print(f"[System] Loading weights from: {model_path}")
    try:
        checkpoint = torch.load(model_path, map_location=device, weights_only=True)
    except Exception:
        checkpoint = torch.load(model_path, map_location=device)
        
    state_dict = checkpoint.get('model_state_dict', checkpoint)
    clean_state_dict = {k.replace('_orig_mod.', ''): v for k, v in state_dict.items()}
    
    try:
        model.load_state_dict(clean_state_dict)
    except Exception as e:
        print(f"❌ ERROR loading weights: {e}")
        return
        
    model.eval()
    total_loss = 0.0
    
    print(f"\n{'='*50}\n📊 STARTING EVALUATION\n{'='*50}")
    
    progress_bar = tqdm(val_loader, desc="Evaluating", unit="batch", leave=True, dynamic_ncols=True)
    
    with torch.no_grad():
        for step, batch in enumerate(progress_bar, 1):
            input_ids = batch["input_ids"].to(device)
            labels = batch["labels"].to(device)
            
            logits, loss = model(input_ids, labels=labels)
            total_loss += loss.item()
            
            if step % 5 == 0:
                hw_stats = logger.log_hardware_stats()
                progress_bar.set_postfix_str(f"Loss: {loss.item():.4f} | {hw_stats}")
                
    avg_loss = total_loss / len(val_loader)
    perplexity = math.exp(avg_loss) if avg_loss < 20 else float('inf')
    
    print(f"\n✅ Evaluation Complete!")
    print(f"📈 Average Loss: {avg_loss:.4f}")
    print(f"🧠 Perplexity:   {perplexity:.4f}\n")
    
    logger.log_metrics("eval", "all", avg_loss, extra={"perplexity": perplexity})

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", type=str, default=None, help="Path to the model weights")
    args = parser.parse_args()
    
    evaluate(args.model_path)
