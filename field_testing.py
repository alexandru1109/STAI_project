import sys
import torch

# This script is used for manual debugging and quick field tests of the components.

def test_hardware():
    print("--- Hardware Test ---")
    if torch.cuda.is_available():
        print(f"CUDA is available! Device: {torch.cuda.get_device_name(0)}")
        print(f"Total VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    else:
        print("CUDA is NOT available. Please check drivers.")
        
def test_imports():
    print("\n--- Imports Test ---")
    try:
        from STAI_project.utils.global_settings import PATHS
        from STAI_project.model.model import RoBERTaCausalLM
        from STAI_project.dataset.dataloader import get_dataloader
        print("All local modules imported successfully.")
    except Exception as e:
        print(f"Import failed: {e}")

if __name__ == "__main__":
    test_hardware()
    test_imports()
    print("\nField testing environment ready.")
