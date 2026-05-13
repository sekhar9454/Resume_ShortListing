import sys
import json
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
import torch.nn.functional as F
# pyrefly: ignore [missing-import]
from transformers import AutoTokenizer, AutoModel


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MAX_LENGTH = 512


class SimilarityModel(nn.Module):
    def __init__(self, model_name=MODEL_NAME, embedding_dim=384):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        self.embedding_dim = embedding_dim

        self.classifier = nn.Sequential(
            nn.Linear(embedding_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1)
        )

    def mean_pooling(self, model_output, attention_mask):
        token_embs = model_output.last_hidden_state
        mask_exp = attention_mask.unsqueeze(-1).expand(token_embs.size()).float()
        return torch.sum(token_embs * mask_exp, 1) / mask_exp.sum(1).clamp(min=1e-9)

    def forward(self, input_ids, attention_mask):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        emb = self.mean_pooling(out, attention_mask)
        return self.classifier(emb).squeeze(1)


def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)

        data = json.loads(input_data)
        resume_text = data.get("resume", "")
        jd_text = data.get("jd", "")

        MODEL_DIR = "./saved_model"
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # Load tokenizer (saved during training)
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)

        # Create model with pretrained encoder, then load fine-tuned weights
        model = SimilarityModel(MODEL_NAME)
        model.load_state_dict(torch.load(f"{MODEL_DIR}/model.pth", map_location=device))
        model.to(device)
        model.eval()

        # Tokenize
        encoded = tokenizer(resume_text, jd_text, truncation=True, padding='max_length',
                       max_length=MAX_LENGTH, return_tensors='pt')

        with torch.no_grad():
            logits = model(
                encoded['input_ids'].to(device), encoded['attention_mask'].to(device)
            )
            if logits.dim() == 0:
                logits = logits.unsqueeze(0)
            prob = torch.sigmoid(logits).item()

        print(json.dumps({
            "prediction": 1 if prob > 0.5 else 0,
            "confidence": prob,
            "status": "success"
        }))

    except Exception as e:
        print(json.dumps({"error": str(e), "status": "failed"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
