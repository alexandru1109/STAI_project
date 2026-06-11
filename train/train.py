import sys
import os
import torch
import torch.optim as optim
from torch.cuda.amp import GradScaler, autocast
import time
from tqdm import tqdm
import psutil

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from STAI_project.utils.global_settings import PATHS, MODEL_CONFIG, TRAIN_CONFIG
from STAI_project.utils.logger import ProjectLogger
from STAI_project.dataset.dataloader import get_dataloader
from STAI_project.model.model import RoBERTaCausalLM

def save_checkpoint(model, optimizer, scaler, epoch, step, loss, filename):
    filepath = os.path.join(PATHS["checkpoints"], filename)
    state = {
        'epoch': epoch,
        'step': step,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'scaler_state_dict': scaler.state_dict(),
        'loss': loss,
    }
    torch.save(state, filepath)

def get_hardware_stats_str(logger):
    return logger.log_hardware_stats()

def train():
    logger = ProjectLogger(log_file="train.log")
    print(f"\n{'='*50}\n🚀 INIT: Model Training Pipeline\n{'='*50}")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == 'cuda':
        torch.backends.cudnn.benchmark = True
        print(f"[Hardware] Using GPU: {torch.cuda.get_device_name(0)}")
    
    print("[Data] Loading training dataset...")
    train_loader = get_dataloader("train")
    
    print("[Model] Initializing RoBERTaCausalLM...")
    model = RoBERTaCausalLM(MODEL_CONFIG).to(device)
    
    if torch.__version__.startswith('2.') and sys.platform != 'win32':
        print("[Model] Compiling model for extra performance (torch.compile)...")
        try:
            model = torch.compile(model)
        except Exception as e:
            print(f"[Model] Compile failed, proceeding dynamically: {e}")
            
    optimizer = optim.AdamW(model.parameters(), lr=TRAIN_CONFIG["learning_rate"], weight_decay=TRAIN_CONFIG["weight_decay"])
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=TRAIN_CONFIG["epochs"] * len(train_loader))
    scaler = GradScaler(enabled=TRAIN_CONFIG["mixed_precision"])
    
    epochs = TRAIN_CONFIG["epochs"]
    grad_acc_steps = TRAIN_CONFIG["gradient_accumulation_steps"]
    
    print(f"\n{'='*50}\n🔥 STARTING TRAINING: {epochs} Epochs\n{'='*50}")
    
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0
        
        # Setup TQDM progress bar for the epoch
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch}/{epochs}", unit="batch", leave=True, dynamic_ncols=True)
        
        for step, batch in enumerate(progress_bar, 1):
            input_ids = batch["input_ids"].to(device, non_blocking=True)
            labels = batch["labels"].to(device, non_blocking=True)
            
            with autocast(enabled=TRAIN_CONFIG["mixed_precision"]):
                logits, loss = model(input_ids, labels=labels)
                loss = loss / grad_acc_steps
                
            scaler.scale(loss).backward()
            
            if step % grad_acc_steps == 0:
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)
                scheduler.step()
                
            actual_loss = loss.item() * grad_acc_steps
            total_loss += actual_loss
            
            # Update terminal progress bar
            if step % 5 == 0:  # Update stats every 5 batches to avoid overhead
                hw_stats = get_hardware_stats_str(logger)
                progress_bar.set_postfix_str(f"Loss: {actual_loss:.4f} | {hw_stats}")
            
            # Log to file silently
            if step % 100 == 0:
                logger.log_metrics(epoch, step, total_loss / step)
                
        avg_epoch_loss = total_loss / len(train_loader)
        print(f"✅ Epoch {epoch} completed. Average Loss: {avg_epoch_loss:.4f}")
        
        if epoch % TRAIN_CONFIG["save_every_epochs"] == 0:
            checkpoint_name = f"model_epoch_{epoch}.pt"
            save_checkpoint(model, optimizer, scaler, epoch, step, avg_epoch_loss, checkpoint_name)
            print(f"💾 Checkpoint saved: {checkpoint_name}")
            
    final_model_path = os.path.join(PATHS["model_save"], "roberta_causal_lm_final.pt")
    torch.save(model.state_dict(), final_model_path)
    print(f"\n🎉 Training Complete! Final weights saved to: {final_model_path}\n")

if __name__ == "__main__":
    train()
