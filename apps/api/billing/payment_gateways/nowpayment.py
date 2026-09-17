import requests
from django.conf import settings


class NowPaymentsClient:
    API_KEY = settings.NOWPAYMENTS_API_KEY
    if settings.SANDBOX:
        API_KEY = settings.NOWPAYMENTS_SANDBOX_API_KEY
        BASE_URL = "https://api-sandbox.nowpayments.io/v1"
    else:
        API_KEY = settings.NOWPAYMENTS_API_KEY
        BASE_URL = "https://api.nowpayments.io/v1"

    @classmethod
    def pay(cls, amount, description, order_id, price_currency="usd", pay_currency="btc"):
        url = f"{cls.BASE_URL}/invoice"
        ipn_callback_url = settings.CALLBACK_URL
        headers = {"x-api-key": cls.API_KEY, "Content-Type": "application/json"}
        payload = {
            "price_amount": amount,
            "price_currency": price_currency,
            "pay_currency": pay_currency,
            "order_id": order_id,
            "order_description": description,
        }
        if ipn_callback_url:
            payload["success_url"] = ipn_callback_url
            payload["cancel_url"] = settings.CANCEL_URL

        response = requests.post(url, json=payload, headers=headers)
        invoice_data = response.json()
        if "invoice_url" in invoice_data:
            return {
                "status": True,
                "url": invoice_data["invoice_url"],
                "payment_id": invoice_data["id"],
            }
        else:
            return {"status": False, "error": invoice_data}

    @classmethod
    def verify(cls, payment_id):
        url = f"{cls.BASE_URL}/payment/{payment_id}"
        headers = {"x-api-key": cls.API_KEY}
        response = requests.get(url, headers=headers)
        data = response.json()
        if data.get("payment_status") == "finished":
            return {"status": True, "data": data}
        else:
            return {"status": False, "data": data}
