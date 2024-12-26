from abc import ABC, abstractmethod
import torch

class BaseModel(ABC):
    def __init__(self, model_name):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None

    @abstractmethod
    def load(self):
        pass

    @abstractmethod
    def run(self, prompt, context, image):
        pass

    def set_platform(self):
        if torch.cuda.is_available():
            return torch.device("cuda")
        if torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")