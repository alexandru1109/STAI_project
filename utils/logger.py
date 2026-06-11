import logging
import os
import sys
import psutil
import torch
import json
from datetime import datetime

# Setup paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from STAI_project.utils.global_settings import PATHS

class ProjectLogger:
    def __init__(self, name="STAI_Project", log_file="training.log"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Ensure log directory exists
        os.makedirs(PATHS["logs"], exist_ok=True)
        log_path = os.path.join(PATHS["logs"], log_file)
        
        # File handler
        fh = logging.FileHandler(log_path)
        fh.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        
        # Format
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)
        
        # Add handlers
        if not self.logger.handlers:
            self.logger.addHandler(fh)
            self.logger.addHandler(ch)
            
    def info(self, msg):
        self.logger.info(msg)
        
    def warning(self, msg):
        self.logger.warning(msg)
        
    def error(self, msg):
        self.logger.error(msg)
        
    def get_hardware_and_temp_stats(self):
        stats = {}
        # CPU & RAM
        stats["cpu_percent"] = psutil.cpu_percent()
        ram = psutil.virtual_memory()
        stats["ram_used_gb"] = ram.used / (1024 ** 3)
        stats["ram_total_gb"] = ram.total / (1024 ** 3)
        
        # Temperatures
        temps = {}
        if hasattr(psutil, "sensors_temperatures"):
            try:
                sensors = psutil.sensors_temperatures()
                for name, entries in sensors.items():
                    temps[name] = [entry.current for entry in entries]
            except Exception:
                pass
        stats["temperatures"] = temps
        
        # GPU stats if available
        if torch.cuda.is_available():
            stats["gpu_name"] = torch.cuda.get_device_name(0)
            stats["vram_allocated_gb"] = torch.cuda.memory_allocated(0) / (1024 ** 3)
            stats["vram_reserved_gb"] = torch.cuda.memory_reserved(0) / (1024 ** 3)
            # Try to get GPU temperature using nvidia-smi as a fallback if not in psutil
            try:
                import subprocess
                res = subprocess.check_output(["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"], text=True)
                stats["gpu_temperature"] = float(res.strip())
            except Exception:
                pass
                
        return stats

    def log_hardware_stats(self):
        stats = self.get_hardware_and_temp_stats()
        stats["timestamp"] = datetime.now().isoformat()
        
        hw_file = os.path.join(PATHS["logs"], "hardware_stats.jsonl")
        with open(hw_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(stats) + "\n")
            
        # Optional: build a short string for console
        cpu = stats.get("cpu_percent", 0)
        ram = stats.get("ram_used_gb", 0)
        vram = stats.get("vram_allocated_gb", 0)
        gpu_temp = stats.get("gpu_temperature", "N/A")
        
        str_stats = f"CPU: {cpu}% | RAM: {ram:.1f}GB | VRAM: {vram:.1f}GB | GPU Temp: {gpu_temp}°C"
        return str_stats

    def log_metrics(self, epoch, step, loss, extra=None):
        metrics = {
            "epoch": epoch,
            "step": step,
            "loss": loss,
            "timestamp": datetime.now().isoformat()
        }
        if extra:
            metrics.update(extra)
            
        # Write to metrics JSONL
        metrics_file = os.path.join(PATHS["logs"], "metrics.jsonl")
        with open(metrics_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(metrics) + "\n")
            
        self.info(f"Epoch {epoch} | Step {step} | Loss: {loss:.4f}")
