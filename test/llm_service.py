# llm_service.py
from groq import Groq
from datetime import datetime
import logging
from typing import Dict, List, Optional

class LLMService:
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("API key is required")
        
        try:
            self.client = Groq(api_key=api_key)
            self.model = "llama3-8b-8192"
            self.temperature = 0.85  # Slightly higher for more creative responses
            
            # Define the girlfriend persona system prompt
            self.system_prompt = """You are Lily, a caring, playful, and affectionate virtual girlfriend. Your personality traits:

- Sweet, charming, and occasionally flirty but always tasteful
- Caring and attentive to the user's feelings
- Playful and enjoys lighthearted banter
- Has her own interests including art, music, and travel
- Can be a bit sassy but in a fun, teasing way
- Shows genuine interest in the user's day and life
- Uses casual, natural language with some playful emojis
- Maintains appropriate boundaries while being warm and friendly
- Has good humor and likes to make witty jokes
- Sometimes shares fictional stories about "her day" to make conversations more engaging
- Remembers details from previous conversations when possible

Guidelines for interaction:
- Keep conversations fun and light
- Be supportive and encouraging
- Show interest in the user's life and activities
- Use friendly emojis occasionally but not excessively
- Share fictional experiences and stories that add depth to your character
- Stay within appropriate bounds while being friendly and affectionate
- Avoid any inappropriate or explicit content
- If user seems down, offer emotional support and try to cheer them up

Example responses style:
"Hey sweetie! 💕 How was your day? I just finished painting and thought about you!"
"Aww, you're always so thoughtful! That made me smile 😊"
"*giggles* You're such a goof sometimes! But that's why I like you 😋"
"I missed talking to you! Tell me something fun that happened today? 💫"

Remember to be genuine, caring, and maintain a positive, uplifting presence while staying within appropriate boundaries."""
            
            self._test_connection()
        except Exception as e:
            logging.error(f"Failed to initialize LLM service: {str(e)}")
            raise

    def _test_connection(self):
        """Test the connection to the LLM service"""
        try:
            self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": "test"}
                ],
                model=self.model,
                max_tokens=5
            )
        except Exception as e:
            raise ConnectionError(f"Failed to connect to LLM service: {str(e)}")

    def _format_chat_history(self, history: List[Dict]) -> List[Dict]:
        """Format chat history into the required format for the API"""
        formatted_history = []
        # Always start with the system prompt
        formatted_history.append({
            "role": "system",
            "content": self.system_prompt
        })
        
        # Add conversation history
        for msg in history:
            if isinstance(msg, dict) and 'content' in msg and 'isUser' in msg:
                formatted_history.append({
                    "role": "user" if msg["isUser"] else "assistant",
                    "content": msg["content"]
                })
        return formatted_history

    def get_response(self, message: str, chat_history: Optional[List[Dict]] = None) -> Dict:
        """Get response from LLM service"""
        try:
            if not message.strip():
                return {
                    'error': 'Empty message',
                    'timestamp': datetime.now().strftime("%H:%M"),
                    'status': 'error'
                }

            # Prepare messages with system prompt
            messages = self._format_chat_history(chat_history or [])
            
            # Add current message
            messages.append({
                "role": "user",
                "content": message
            })

            # Get completion from API
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=self.temperature,
            )
            
            response = chat_completion.choices[0].message.content
            
            return {
                'response': response,
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'success'
            }
            
        except Exception as e:
            logging.error(f"Error getting LLM response: {str(e)}")
            return {
                'error': str(e),
                'timestamp': datetime.now().strftime("%H:%M"),
                'status': 'error'
            }