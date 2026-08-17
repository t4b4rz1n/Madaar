from django.utils.translation import gettext as _
from rest_framework.renderers import JSONRenderer


def extract_detail_message(data, status_code):
    if not data:
        return None

    if isinstance(data, dict):
        if "detail" in data:
            return data.get("detail")
        if "message" in data:
            return data.get("message")

        if not str(status_code).startswith("2"):
            try:
                for field, errors in data.items():
                    if field != "non_field_errors" and isinstance(errors, list) and errors:
                        return _("Field {field}: {error}").format(field=_(field), error=errors[0])
                if "non_field_errors" in data and isinstance(data["non_field_errors"], list) and data["non_field_errors"]:
                    return data["non_field_errors"][0]
            except Exception:
                pass
            return _("An unknown error occurred")

    if str(status_code).startswith("2"):
        return _("The operation was successful")

    return _("An error occurred during the operation")


class ApiRenderer(JSONRenderer):
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if renderer_context:
            response_obj = renderer_context.get("response")
            status_code = response_obj.status_code if response_obj else 200

            # Prevent double-wrapping if response is already formatted as an envelope
            if isinstance(data, dict) and "status" in data and ("data" in data or "errors" in data):
                return super().render(data, accepted_media_type, renderer_context)

            is_success = str(status_code).startswith("2")
            message = extract_detail_message(data, status_code)

            if is_success:
                response = {
                    "status": True,
                    "message": message,
                    "data": data if data is not None else None,
                }
            else:
                import copy

                try:
                    errors_data = copy.deepcopy(data)
                except Exception:
                    errors_data = data

                response = {
                    "status": False,
                    "message": message,
                    "errors": errors_data if isinstance(errors_data, (dict, list)) else None,
                    "data": None,
                }

            return super().render(response, accepted_media_type, renderer_context)

        response = {
            "status": True,
            "message": None,
            "data": data if data is not None else None,
        }
        return super().render(response, accepted_media_type, renderer_context)

