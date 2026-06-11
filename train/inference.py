import sys
import os
import torch
import time
import psutil
from tokenizers import Tokenizer

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from STAI_project.utils.global_settings import PATHS, MODEL_CONFIG
from STAI_project.utils.logger import ProjectLogger
from STAI_project.model.model import RoBERTaCausalLM

def load_model(model_path, device):
    print(f"[Model] Initializing architecture...")
    model = RoBERTaCausalLM(MODEL_CONFIG).to(device)
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model weight file {model_path} not found.")
        
    print(f"[Model] Loading weights from {model_path}...")
    try:
        checkpoint = torch.load(model_path, map_location=device, weights_only=True)
    except Exception:
        checkpoint = torch.load(model_path, map_location=device)
        
    state_dict = checkpoint.get('model_state_dict', checkpoint)
    clean_state_dict = {k.replace('_orig_mod.', ''): v for k, v in state_dict.items()}
    model.load_state_dict(clean_state_dict)
    
    model.eval()
    return model

def generate_text(prompt, model_path=None, max_new_tokens=100, temperature=0.6, top_k=30, repetition_penalty=1.2):
    logger = ProjectLogger(log_file="inference.log")
    print(f"\n{'='*50}\n✍️  INIT: Text Generation (Inference)\n{'='*50}")
    hw_stats_str = logger.log_hardware_stats()
    print(f"🖥️  System Stats -> {hw_stats_str}")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    if model_path is None:
        model_path = os.path.join(PATHS["model_save"], "roberta_causal_lm_final.pt")
        
    model = load_model(model_path, device)
    
    print(f"[Tokenizer] Loading BPE Tokenizer...")
    tokenizer = Tokenizer.from_file(PATHS["tokenizer"])
    bos_token_id = tokenizer.token_to_id("<s>")
    eos_token_id = tokenizer.token_to_id("</s>")
    
    # Encode prompt
    encoding = tokenizer.encode(prompt)
    input_ids = [bos_token_id] + encoding.ids
    input_tensor = torch.tensor([input_ids], dtype=torch.long, device=device)
    
    print(f"\n{'='*50}")
    print(f"📥 Prompt: {prompt}")
    print(f"⚙️  Params: Max Tokens={max_new_tokens}, Temp={temperature}, Top-K={top_k}, Rep Penalty={repetition_penalty}")
    print(f"{'='*50}\nGenerating...\n")
    
    start_time = time.time()
    
    # Generate
    with torch.no_grad():
        output_tensor = model.generate(
            input_ids=input_tensor,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_k=top_k,
            repetition_penalty=repetition_penalty,
            eos_token_id=eos_token_id
        )
        
    generation_time = time.time() - start_time
    output_ids = output_tensor[0].tolist()
    generated_text = tokenizer.decode(output_ids, skip_special_tokens=True)
    
    tokens_generated = len(output_ids) - len(input_ids)
    speed = tokens_generated / generation_time
    
    print(f"📝 RESULT:\n\n{generated_text}\n")
    print(f"{'-'*50}")
    print(f"⏱️  Time: {generation_time:.2f}s | Speed: {speed:.1f} tokens/sec")
    hw_stats_str = logger.log_hardware_stats()
    print(f"🖥️  System Stats -> {hw_stats_str}")
    print(f"{'-'*50}\n")
    
    # Log the result
    os.makedirs(PATHS["logs"], exist_ok=True)
    with open(os.path.join(PATHS["logs"], "inference_results.txt"), "a", encoding="utf-8") as f:
        f.write(f"PROMPT: {prompt}\n")
        f.write(f"RESULT: {generated_text}\n")
        f.write("-" * 50 + "\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", type=str, required=True, help="Starting text")
    parser.add_argument("--model_path", type=str, default=None)
    parser.add_argument("--max_tokens", type=int, default=150)
    parser.add_argument("--temp", type=float, default=0.8)
    parser.add_argument("--top_k", type=int, default=50)
    parser.add_argument("--rep_penalty", type=float, default=1.2)
    args = parser.parse_args()
    
    generate_text(args.prompt, args.model_path, args.max_tokens, args.temp, args.top_k, args.rep_penalty)
