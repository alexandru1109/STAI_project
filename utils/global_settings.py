import os

# Base paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")
DATA_DIR = os.path.join(DATASET_DIR, "data")
MODEL_DIR = os.path.join(PROJECT_ROOT, "model")
SAVED_DIR = os.path.join(MODEL_DIR, "saved")
CHECKIN_DIR = os.path.join(SAVED_DIR, "checkin")
TRAIN_DIR = os.path.join(PROJECT_ROOT, "train")
UTILS_DIR = os.path.join(PROJECT_ROOT, "utils")
LOGS_DIR = os.path.join(UTILS_DIR, "logs")

# MOROCO Dataset Path
MOROCO_BASE_PATH = "/mnt/c/Users/mitro/OneDrive - e-uvt.ro/Desktop/STAI_project/MOROCO/MOROCO/preprocessed"

PATHS = {
    "project_root": PROJECT_ROOT,
    "moroco_train": os.path.join(MOROCO_BASE_PATH, "train", "samples.txt"),
    "moroco_val": os.path.join(MOROCO_BASE_PATH, "validation", "samples.txt"),
    "moroco_test": os.path.join(MOROCO_BASE_PATH, "test", "samples.txt"),
    "processed_train": os.path.join(DATA_DIR, "train.txt"),
    "processed_val": os.path.join(DATA_DIR, "val.txt"),
    "processed_test": os.path.join(DATA_DIR, "test.txt"),
    "tokenizer": os.path.join(DATASET_DIR, "tokenizer.json"),
    "model_save": SAVED_DIR,
    "checkpoints": CHECKIN_DIR,
    "logs": LOGS_DIR
}

# Romanian entities for smart $NE$ replacement
ENTITIES = {
    "first_names": ["Ion", "Maria", "Andrei", "Elena", "Mihai", "Andreea", "Alexandru", "Ioana", "Ștefan", "Ana", "Gabriel", "Diana", "Nicolae", "Cristina", "Gheorghe", "Florin", "Radu", "Iulia", "Adrian", "Mihaela", "Vasile", "Roxana", "Bogdan", "Alina", "Cristian", "Carmen", "Constantin", "Daniela", "Dumitru", "Oana", "Marian", "Simona", "Cătălin", "Silvia", "Ilie", "Loredana", "George", "Gabriela", "Paul", "Nicoleta", "Emil", "Ramona", "Lucian", "Teodora", "Victor", "Camelia", "Tudor", "Laura"],
    "surnames": ["Popescu", "Ionescu", "Popa", "Radu", "Dumitrescu", "Stan", "Stoica", "Gheorghe", "Matei", "Ciobanu", "Ilie", "Rusu", "Marin", "Toma", "Puscas", "Badea", "Mihai", "Vlad", "Nistor", "Diaconu", "Barbu", "Dinu"],
    "locations": ["București", "România", "Cluj", "Timișoara", "Iași", "Constanța", "Brașov", "Craiova", "Galați", "Ploiești", "Oradea", "Brăila", "Arad", "Pitești", "Sibiu", "Bacău", "Europa", "SUA", "Franța", "Germania"]
}

# Model Configuration (Scaled up to GPT-2 Base equivalent ~120M Params)
MODEL_CONFIG = {
    "vocab_size": 32000,
    "max_seq_len": 512,  # Doubled context window
    "d_model": 768,      # Scaled up
    "n_heads": 12,       # Scaled up
    "n_layers": 12,      # Scaled up
    "d_ff": 3072,        # Scaled up
    "dropout": 0.1,
    "pad_token_id": 0,
    "eos_token_id": 2,
    "bos_token_id": 1,
}

# Training Configuration
TRAIN_CONFIG = {
    "batch_size": 16, # Reduced to fit the larger model in 16GB VRAM
    "learning_rate": 3e-4,
    "epochs": 20, # Increased epochs for deeper learning
    "warmup_steps": 2000,
    "weight_decay": 0.01,
    "gradient_accumulation_steps": 4, # Effective batch size = 64
    "save_every_epochs": 2,
    "mixed_precision": True,  # Uses torch.cuda.amp
    "num_workers": 4, # For dataloader
    "pin_memory": True
}
