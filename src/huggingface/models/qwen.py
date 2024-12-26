from models.base import BaseModel
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import asyncio


class QwenModel(BaseModel):
    def __init__(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct"):
        super().__init__(model_name)
        self.model = None
        self.tokenizer = None
        self.platform = self.set_platform()

    async def load(self):
        self.model = AutoModelForCausalLM.from_pretrained(self.model_name).to(self.platform)
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model.eval()

    async def encode(self, prompt: str, context: str):
        messages = [
            {"role": "system", "content": context},
            {"role": "user", "content": prompt}
        ]
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        return self.tokenizer([text], return_tensors='pt').to(self.platform)
    
    async def run(self, prompt: str, context: str, image: None):
        # Encode input
        encoded_input = await self.encode(prompt, context, image)
        input_ids = encoded_input['input_ids']
        attention_mask = encoded_input.get('attention_mask', None)
        
        # Inference
        loop = asyncio.get_event_loop()
        with torch.no_grad():
            if attention_mask is not None:
                outputs = await loop.run_in_executor(None, lambda: self.model.generate(input_ids, attention_mask=attention_mask, max_length=4096))
            else:
                outputs = await loop.run_in_executor(None, lambda: self.model.generate(input_ids, max_length=4096))
        
        # Decode output
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response