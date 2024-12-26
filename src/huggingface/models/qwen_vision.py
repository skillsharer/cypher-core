from models.base import BaseModel
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import torch
import asyncio


class QwenVisionModel(BaseModel):
    def __init__(self, model_name: str = "Qwen/Qwen2.5-0.5B-Instruct"):
        super().__init__(model_name)
        self.model = None
        self.tokenizer = None
        self.platform = self.set_platform()

    async def load(self):
        self.model = Qwen2VLForConditionalGeneration.from_pretrained(self.model_name, torch_dtype="auto", device_map="auto")
        self.processor = AutoProcessor.from_pretrained(self.model_name)

    async def encode(self, prompt: str, context: str, image: None):
        if image:
            messages = [
                {"role": "system", "content": [{"type": "text", "text": context }]},
                {"role": "user", "content": [
                    {"type": "image", "image": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/QVQ/demo.png"},
                    {"type": "text", "text": prompt}
                ]}
            ]
        else:
            messages = [
                {"role": "system", "content": [{"type": "text", "text": context }]},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt}
                ]}            
            ]
        
        text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

        if image:
            image_inputs, video_inputs = process_vision_info(messages)
            inputs = self.processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            ).to(self.platform)
        else:
            inputs = self.processor(
                text=[text],
                return_tensors="pt",
            ).to(self.platform)

        return inputs

    
    async def run(self, prompt: str, context: str, image: None):
        # Encode input
        print("Encoding input...")
        encoded_input = await self.encode(prompt, context, image)
        print("Input encoded.")
        # Inference
        print("Running inference...")
        outputs = self.model.generate(**encoded_input, max_new_tokens=8192)
        print("Inference completed.")
        # Decode output
        print("Decoding output...")
        generated_ids_trimmed = [out_ids[len(in_ids) :] for in_ids, out_ids in zip(encoded_input.input_ids, outputs)]
        response = self.processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)
        print("Output decoded.")
        return response