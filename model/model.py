import torch
import torch.nn as nn
import math

class PositionalEmbedding(nn.Module):
    def __init__(self, max_seq_len, d_model):
        super().__init__()
        self.embedding = nn.Embedding(max_seq_len, d_model)

    def forward(self, x):
        seq_len = x.size(1)
        # Positions are from 0 to seq_len - 1
        positions = torch.arange(seq_len, dtype=torch.long, device=x.device)
        positions = positions.unsqueeze(0).expand_as(x)
        return self.embedding(positions)

class RoBERTaCausalLM(nn.Module):
    """
    A Transformer Decoder-only model for autoregressive text generation.
    It takes inspiration from RoBERTa's embeddings but uses a causal mask 
    for text generation.
    """
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.pad_token_id = config["pad_token_id"]
        
        self.token_embedding = nn.Embedding(config["vocab_size"], config["d_model"], padding_idx=self.pad_token_id)
        self.position_embedding = PositionalEmbedding(config["max_seq_len"], config["d_model"])
        self.dropout = nn.Dropout(config["dropout"])
        
        decoder_layer = nn.TransformerEncoderLayer(
            d_model=config["d_model"],
            nhead=config["n_heads"],
            dim_feedforward=config["d_ff"],
            dropout=config["dropout"],
            activation="gelu",
            batch_first=True,
            norm_first=True # Typical for modern architectures (GPT-2/3 style)
        )
        # We use TransformerEncoder with a causal mask to act as a decoder-only model
        self.transformer = nn.TransformerEncoder(decoder_layer, num_layers=config["n_layers"])
        self.ln_f = nn.LayerNorm(config["d_model"])
        
        self.lm_head = nn.Linear(config["d_model"], config["vocab_size"], bias=False)
        
        # Tie weights between token embedding and lm_head for better performance & memory
        self.lm_head.weight = self.token_embedding.weight
        
        self.loss_fn = nn.CrossEntropyLoss(ignore_index=self.pad_token_id)
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            module.weight.data.normal_(mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                module.bias.data.zero_()
        elif isinstance(module, nn.LayerNorm):
            module.bias.data.zero_()
            module.weight.data.fill_(1.0)

    def generate_causal_mask(self, sz, device):
        mask = (torch.triu(torch.ones(sz, sz, device=device)) == 1).transpose(0, 1)
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask

    def forward(self, input_ids, labels=None):
        seq_len = input_ids.size(1)
        device = input_ids.device
        
        # Embeddings
        x = self.token_embedding(input_ids) + self.position_embedding(input_ids)
        x = self.dropout(x)
        
        # Causal mask to prevent looking into the future
        causal_mask = self.generate_causal_mask(seq_len, device)
        
        # Padding mask to ignore <pad> tokens in attention
        pad_mask = (input_ids == self.pad_token_id)
        
        # Transformer forward
        x = self.transformer(x, mask=causal_mask, src_key_padding_mask=pad_mask, is_causal=True)
        x = self.ln_f(x)
        
        logits = self.lm_head(x)
        
        loss = None
        if labels is not None:
            # Shift so that tokens < n predict n
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            
            # Flatten the tokens
            loss = self.loss_fn(shift_logits.view(-1, shift_logits.size(-1)), shift_labels.view(-1))
            
        return logits, loss

    @torch.no_grad()
    def generate(self, input_ids, max_new_tokens, temperature=1.0, top_k=50, repetition_penalty=1.0, eos_token_id=None):
        self.eval()
        for _ in range(max_new_tokens):
            # Crop to max_seq_len
            idx_cond = input_ids[:, -self.config["max_seq_len"]:]
            
            logits, _ = self(idx_cond)
            # Take the logits of the last token
            next_token_logits = logits[:, -1, :] / temperature
            
            # Apply repetition penalty
            if repetition_penalty != 1.0:
                for i in range(input_ids.shape[0]):
                    for token_id in set(input_ids[i].tolist()):
                        if next_token_logits[i, token_id] < 0:
                            next_token_logits[i, token_id] *= repetition_penalty
                        else:
                            next_token_logits[i, token_id] /= repetition_penalty
            
            # Top-K filtering
            if top_k is not None:
                v, _ = torch.topk(next_token_logits, min(top_k, next_token_logits.size(-1)))
                next_token_logits[next_token_logits < v[:, [-1]]] = -float('Inf')
                
            probs = torch.nn.functional.softmax(next_token_logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            input_ids = torch.cat((input_ids, next_token), dim=1)
            
            if eos_token_id is not None and (next_token == eos_token_id).all():
                break
                
        return input_ids
