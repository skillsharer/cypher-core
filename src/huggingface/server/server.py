from quart import Quart, request, jsonify
#from models.qwen import QwenModel
from models.qwen_vision import QwenVisionModel

app = Quart(__name__)
app.config['model'] = None

@app.route('/initialize', methods=['POST'])
async def initialize():
    if app.config['model'] is not None:
        return jsonify({"message": "Model already loaded."})
    
    data = await request.json
    model_name = data['model_name']
    if "qwen" in model_name.lower():
        model = QwenVisionModel(model_name)
    else:
        return jsonify({"message": "Model not found."})
    try:
        await model.load()
        print(f"Model {model_name} loaded.")
        app.config['model'] = model
        return jsonify({"message": "Model loaded."})
    finally:
        # Ensure proper cleanup of semaphore objects
        if hasattr(model, 'cleanup'):
            model.cleanup()

@app.route('/text_inference', methods=['POST'])
async def text_inference():
    model = app.config['model']
    if model is None:
        return jsonify({"message": "Model not loaded."})
    data = await request.get_json()
    context = data['system']
    prompt = data['messages'][0]['content'][0]['text']
    response = await model.run(prompt, context)
    return jsonify(response)

@app.route('/text_and_image_inference', methods=['POST'])
async def text_and_image_inference():
    model = app.config['model']
    if model is None:
        return jsonify({"message": "Model not loaded."})
    data = await request.get_json()
    context = data['system']
    prompt = data['messages'][0]['content'][0]['text']
    image = None
    response = await model.run(prompt, context, image)
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='localhost', port=5000)