import json
import logging
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from automations.services import TelegramBotService

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            message = data.get('message', {})
            chat = message.get('chat', {})
            text = message.get('text', '')
            
            chat_id = str(chat.get('id', ''))
            
            if not chat_id:
                return JsonResponse({"status": "ignored"})
                
            # Delegate to the professional bot service layer
            TelegramBotService.handle_message(chat_id, text)
            
            return JsonResponse({"status": "ok"})
            
        except Exception as e:
            logger.error(f"Error processing Telegram webhook: {e}", exc_info=True)
            return JsonResponse({"status": "error"}, status=400)
