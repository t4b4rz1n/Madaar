import json
import logging
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import uuid
from django.core.cache import cache
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from automations.services import TelegramBotService

logger = logging.getLogger(__name__)

class GenerateTelegramMagicLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        token = str(uuid.uuid4().hex)
        
        # Save token in database instead of cache, handling soft deletes
        from accounts.models import WorkStyleProfile
        wsp = WorkStyleProfile.all_objects.filter(user=request.user).first()
        
        if wsp and not wsp.is_deleted and getattr(wsp, 'telegram_chat_id', None):
            return Response({"error": "This account is already connected to Telegram."}, status=400)
            
        if not wsp:
            wsp = WorkStyleProfile(user=request.user)
        elif wsp.is_deleted:
            wsp.is_deleted = False
            wsp.telegram_chat_id = None
            wsp.notify_via_telegram = False
            
        wsp.telegram_connect_token = token
        wsp.save()
        
        bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', 'MadaarBot')
        link = f"https://t.me/{bot_username}?start={token}"
        return Response({"url": link})

@method_decorator(csrf_exempt, name='dispatch')
class TelegramWebhookView(View):
    """
    Receives all incoming updates from Telegram Bot API.
    Handles both regular messages and inline keyboard callback queries.
    """

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)

            # Handle callback_query (inline button presses)
            callback_query = data.get('callback_query')
            if callback_query:
                chat_id = str(callback_query['message']['chat']['id'])
                message_id = callback_query['message']['message_id']
                callback_data = callback_query.get('data', '')
                callback_query_id = callback_query['id']
                tg_user = callback_query.get('from', {})
                tg_username = tg_user.get('username', '').lower()
                tg_language_code = tg_user.get('language_code', 'en')

                TelegramBotService.handle_callback(
                    chat_id=chat_id,
                    message_id=message_id,
                    callback_data=callback_data,
                    callback_query_id=callback_query_id,
                    tg_language_code=tg_language_code,
                )
                return JsonResponse({"status": "ok"})

            # Handle regular messages
            message = data.get('message', {})
            if not message:
                return JsonResponse({"status": "ignored"})

            chat = message.get('chat', {})
            text = message.get('text', '')
            chat_id = str(chat.get('id', ''))
            tg_user = message.get('from', {})
            tg_username = tg_user.get('username', '').lower()
            tg_language_code = tg_user.get('language_code', 'en')

            if not chat_id:
                return JsonResponse({"status": "ignored"})

            TelegramBotService.handle_message(chat_id, text, tg_language_code=tg_language_code)
            return JsonResponse({"status": "ok"})

        except Exception as e:
            logger.error(f"Telegram webhook error: {e}", exc_info=True)
            return JsonResponse({"status": "error"}, status=200)

import hmac
import hashlib
from django.conf import settings
from django.utils.encoding import force_bytes
from automations.github_service import GithubAutomationService

@method_decorator(csrf_exempt, name='dispatch')
class GithubWebhookView(View):
    def verify_signature(self, request):
        secret = getattr(settings, 'GITHUB_WEBHOOK_SECRET', '')
        if not secret:
            return True # In dev, if secret is empty, skip validation
        
        signature_header = request.META.get('HTTP_X_HUB_SIGNATURE_256')
        if not signature_header:
            return False

        hash_obj = hmac.new(
            force_bytes(secret),
            msg=request.body,
            digestmod=hashlib.sha256
        )
        expected_signature = "sha256=" + hash_obj.hexdigest()
        return hmac.compare_digest(expected_signature, signature_header)

    def post(self, request, *args, **kwargs):
        if not self.verify_signature(request):
            return JsonResponse({"status": "forbidden"}, status=403)

        event = request.META.get('HTTP_X_GITHUB_EVENT', '')
        try:
            payload = json.loads(request.body)
            repo_name = payload.get('repository', {}).get('full_name', 'Unknown')
            
            if event == 'push':
                commits = payload.get('commits', [])
                for commit in commits:
                    msg = commit.get('message', '')
                    committer = commit.get('author', {}).get('username') or commit.get('author', {}).get('name')
                    GithubAutomationService.handle_commit(msg, committer, repo_name)
                    
            elif event == 'pull_request':
                action = payload.get('action')
                pr = payload.get('pull_request', {})
                title = pr.get('title', '')
                sender = payload.get('sender', {}).get('login', 'Unknown')
                
                if action == 'closed' and pr.get('merged'):
                    action = 'merged'
                    
                GithubAutomationService.handle_pull_request(title, action, sender, repo_name)

            return JsonResponse({"status": "ok"})
            
        except Exception as e:
            logger.error(f"GitHub webhook error: {e}", exc_info=True)
            return JsonResponse({"status": "error"}, status=500)
