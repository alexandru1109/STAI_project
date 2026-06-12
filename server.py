import sys
import os
import time
import torch

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn


HERE = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, HERE)

from utils.global_settings import PATHS, MODEL_CONFIG
from model.model import RoBERTaCausalLM


app = FastAPI(title="STAI Inference API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_tokenizer = None
_device = None


def get_model_and_tokenizer():
    global _model, _tokenizer, _device

    if _model is not None:
        return _model, _tokenizer, _device

    from tokenizers import Tokenizer

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


    model_path = os.path.join(PATHS["model_save"], "roberta_causal_lm_final.pt")

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model weights not found at:\n  {model_path}\n\n"
            f"Make sure roberta_causal_lm_final.pt is in STAI_project/model/saved/"
        )

    print(f"[server] Loading model from: {model_path}")
    print(f"[server] Device: {_device}")

    _model = RoBERTaCausalLM(MODEL_CONFIG).to(_device)

    try:
        checkpoint = torch.load(model_path, map_location=_device, weights_only=True)
    except Exception:
        checkpoint = torch.load(model_path, map_location=_device)

    state_dict = checkpoint.get("model_state_dict", checkpoint)
    clean_state_dict = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}
    _model.load_state_dict(clean_state_dict)
    _model.eval()

    print(f"[server] Model loaded OK — {sum(p.numel() for p in _model.parameters()):,} parameters")

    tokenizer_path = PATHS["tokenizer"]
    if not os.path.exists(tokenizer_path):
        raise FileNotFoundError(
            f"Tokenizer not found at:\n  {tokenizer_path}\n\n"
            f"Expected: STAI_project/dataset/tokenizer.json"
        )
    _tokenizer = Tokenizer.from_file(tokenizer_path)
    print(f"[server] Tokenizer loaded OK")

    return _model, _tokenizer, _device



class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    max_new_tokens: int = Field(default=150, ge=10, le=512)
    temperature: float = Field(default=0.8, ge=0.1, le=2.0)
    top_k: int = Field(default=50, ge=1, le=200)
    repetition_penalty: float = Field(default=1.2, ge=1.0, le=2.0)


class GenerateResponse(BaseModel):
    generated_text: str
    tokens_generated: int
    time_seconds: float
    tokens_per_second: float
    device: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "cuda_available": torch.cuda.is_available(),
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }


@app.post("/load")
def load_model_endpoint():
    """Pre-warm: loads the model into VRAM before the first /generate call."""
    try:
        get_model_and_tokenizer()
        return {"status": "loaded"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    try:
        model, tokenizer, device = get_model_and_tokenizer()
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model load error: {e}")

    bos_id = tokenizer.token_to_id("<s>")
    eos_id = tokenizer.token_to_id("</s>")

    encoding = tokenizer.encode(req.prompt)
    input_ids = [bos_id] + encoding.ids
    input_tensor = torch.tensor([input_ids], dtype=torch.long, device=device)

    t0 = time.time()
    with torch.no_grad():
        output_tensor = model.generate(
            input_ids=input_tensor,
            max_new_tokens=req.max_new_tokens,
            temperature=req.temperature,
            top_k=req.top_k,
            repetition_penalty=req.repetition_penalty,
            eos_token_id=eos_id,
        )
    elapsed = time.time() - t0

    output_ids = output_tensor[0].tolist()
    generated_text = tokenizer.decode(output_ids, skip_special_tokens=True)
    tokens_generated = len(output_ids) - len(input_ids)

    return GenerateResponse(
        generated_text=generated_text,
        tokens_generated=tokens_generated,
        time_seconds=round(elapsed, 2),
        tokens_per_second=round(tokens_generated / elapsed, 1) if elapsed > 0 else 0,
        device="GPU" if torch.cuda.is_available() else "CPU",
    )


@app.get("/")
def serve_ui():
    ui_path = os.path.join(HERE, "ui.html")
    if os.path.exists(ui_path):
        return FileResponse(ui_path)
    return {"error": "ui.html not found next to server.py"}


if __name__ == "__main__":
    print(f"[server] Project root: {HERE}")
    print(f"[server] Model expected at: {os.path.join(PATHS['model_save'], 'roberta_causal_lm_final.pt')}")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)