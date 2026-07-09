import json

import requests
from django.conf import settings
from django.utils.translation import gettext as _

ZP_ERRORS = {
    -9: _("Validation error"),
    -10: _("Terminal is not valid, please check merchant_id or ip address."),
    -11: _("Terminal is not active, please contact our support team."),
    -12: _("Too many attempts, please try again later."),
    -15: _("Terminal user is suspended: (please contact our support team)."),
    -16: _("Terminal user level is not valid: (please contact our support team)."),
    -17: _("Terminal user level is not valid: (please contact our support team)."),
    100: _("Success"),
    -30: _("Terminal does not allow to accept floating wages."),
    -31: _("Terminal does not allow to accept wages, please add default bank account in panel."),
    -32: _("Wages is not valid, Total wages(floating) has been overloaded max amount."),
    -33: _("Wages floating is not valid."),
    -34: _("Wages is not valid, Total wages(fixed) has been overloaded max amount."),
    -35: _("Wages is not valid, Total wages(floating) has reached the limit in max parts."),
    -36: _("The minimum amount for wages(floating) should be 10,000 Rials."),
    -37: _("One or more iban entered for wages(floating) from the bank side are inactive."),
    -38: _("Wages need to set Iban in shaparak."),
    -39: _("Wages have an error!"),
    -40: _("Invalid extra params, expire_in is not valid."),
    -50: _("Session is not valid, amounts values are not the same."),
    -51: _("Session is not valid, session is not an active paid try."),
    -52: _("Oops!!, please contact our support team."),
    -53: _("Session is not this merchant_id session."),
    -54: _("Invalid authority."),
    101: _("Verified"),
}

if settings.SANDBOX:
    ZP_API_REQUEST = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    ZP_API_VERIFY = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    ZP_API_STARTPAY = "https://sandbox.zarinpal.com/pg/StartPay/"
else:
    ZP_API_REQUEST = "https://api.zarinpal.com/pg/v4/payment/request.json"
    ZP_API_VERIFY = "https://api.zarinpal.com/pg/v4/payment/verify.json"
    ZP_API_STARTPAY = "https://api.zarinpal.com/pg/StartPay/"


class ZarinpalClient:
    MERCHANT_ID = settings.ZARINPAL_MERCHANT_ID
    CALLBACK_URL = settings.CALLBACK_URL

    @classmethod
    def pay(cls, amount, description, email="ali.fathi.13121110@gmail.com", mobile="993123456789"):
        data = {
            "merchant_id": cls.MERCHANT_ID,
            "amount": amount,
            "description": description,
            "callback_url": cls.CALLBACK_URL,
            "currency": "IRT",
            # "metadata": {"email": email, "mobile": str(mobile) if mobile else ""},
        }

        print(data)
        data_json = json.dumps(data)
        headers = {"content-type": "application/json", "content-length": str(len(data_json))}
        try:
            response = requests.post(ZP_API_REQUEST, data=data_json, headers=headers, timeout=10)
            json_response = response.json()
            if json_response.get("data"):
                authority = str(json_response["data"]["authority"])
                url = ZP_API_STARTPAY + authority
                return {"status": True, "url": url, "authority": authority}
            else:
                error_code = json_response.get("errors", {}).get("code", None)
                return {"status": False, "code": error_code}
        except requests.exceptions.Timeout:
            return {"status": None, "code": 502, "detail": _("Connection timed out")}
        except requests.exceptions.ConnectionError:
            return {
                "status": None,
                "code": 502,
                "detail": _("Error in connection with the payment gateway"),
            }
        except Exception:
            return {"status": None, "code": 500, "detail": _("An unknown error occurred")}

    @classmethod
    def verify(cls, authority, amount):
        data = {"merchant_id": cls.MERCHANT_ID, "amount": amount, "authority": authority}
        data_json = json.dumps(data)
        headers = {"content-type": "application/json", "content-length": str(len(data_json))}
        try:
            response = requests.post(ZP_API_VERIFY, data=data_json, headers=headers, timeout=10)
            json_response = response.json()
            if json_response.get("data"):
                code = json_response["data"]["code"]
                if code == 100:
                    return {"status": True, "code": code, "ref_id": json_response["data"]["ref_id"]}
                else:
                    return {"status": False, "code": code}
            else:
                error_code = json_response.get("errors", {}).get("code", None)
                return {"status": False, "code": error_code}
        except requests.exceptions.Timeout:
            return {"status": None, "code": 502, "detail": _("Connection timed out")}
        except requests.exceptions.ConnectionError:
            return {
                "status": None,
                "code": 502,
                "detail": _("Error in connection with the payment gateway"),
            }
        except Exception:
            return {"status": None, "code": 500, "detail": _("An unknown error occurred")}
