import argparse
import os
import sys

def run_preprocessing():
    os.system(f"{sys.executable} dataset/preprocessing.py")

def run_training():
    os.system(f"{sys.executable} train/train.py")

def run_evaluation():
    os.system(f"{sys.executable} train/eval.py")

def run_inference(prompt):
    os.system(f'{sys.executable} train/inference.py --prompt "{prompt}"')

def print_banner(text):
    print(f"\n" + "█" * 60)
    print(f"█ {text.center(56)} █")
    print(f"█" * 60 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="STAI Project: RoBERTa Causal LM Generator (Fake News pipeline)")
    parser.add_argument("--mode", type=str, required=True, choices=["preprocess", "train", "eval", "infer", "all"], help="Pipeline stage to execute")
    parser.add_argument("--prompt", type=str, default="Aseară, în centrul capitalei, a avut loc un eveniment", help="Prompt for inference")
    
    args = parser.parse_args()
    
    if args.mode == "preprocess":
        print_banner("STAGE 1/4: PREPROCESSING & TOKENIZER")
        run_preprocessing()
        
    elif args.mode == "train":
        print_banner("STAGE 2/4: MODEL TRAINING")
        run_training()
        
    elif args.mode == "eval":
        print_banner("STAGE 3/4: MODEL EVALUATION")
        run_evaluation()
        
    elif args.mode == "infer":
        print_banner("STAGE 4/4: TEXT GENERATION (INFERENCE)")
        run_inference(args.prompt)
        
    elif args.mode == "all":
        print_banner("🚀 FULL PIPELINE EXECUTION STARTED 🚀")
        
        print_banner("STAGE 1/4: PREPROCESSING & TOKENIZER")
        run_preprocessing()
        
        print_banner("STAGE 2/4: MODEL TRAINING")
        run_training()
        
        print_banner("STAGE 3/4: MODEL EVALUATION")
        run_evaluation()
        
        print_banner("STAGE 4/4: TEXT GENERATION (INFERENCE)")
        run_inference(args.prompt)
        
        print_banner("🎉 PIPELINE COMPLETED SUCCESSFULLY 🎉")
