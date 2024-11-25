# app.py
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import os
from llm_service import LLMService

app = Flask(__name__)

# Initialize LLM service with error handling
try:
    llm = LLMService(api_key="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")
except Exception as e:
    print(f"Error initializing LLM service: {e}")
    llm = None

@app.route('/')
def home():
    return render_template('index.html')

@app.errorhandler(500)
def handle_500_error(e):
    return jsonify({
        'error': 'Internal server error occurred',
        'timestamp': datetime.now().strftime("%H:%M"),
        'status': 'error'
    }), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Validate request data
        if not request.is_json:
            return jsonify({
                'error': 'Invalid request format. JSON required.',
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }), 400

        data = request.get_json()
        
        if 'message' not in data:
            return jsonify({
                'error': 'No message provided',
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }), 400

        user_message = data.get('message', '').strip()
        chat_history = data.get('history', [])
        user_id = data.get('userId', '')

        if not user_message:
            return jsonify({
                'error': 'Empty message',
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }), 400

        # Check if LLM service is available
        if llm is None:
            return jsonify({
                'error': 'LLM service unavailable',
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }), 503

        # Get response from LLM service
        result = llm.get_response(user_message, chat_history)
        
        if result.get('status') == 'error':
            return jsonify({
                'error': result.get('error', 'Unknown error occurred'),
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }), 500

        # Format successful response
        return jsonify({
            'response': result['response'],
            'timestamp': datetime.now().strftime("%H:%M"),
            'status': 'success'
        })

    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'error': f"An unexpected error occurred: {str(e)}",
            'timestamp': datetime.now().strftime("%H:%M"),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)