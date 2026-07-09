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
                    if field != "non_field_errors" and isinstance(errors, list):
                        return _("Field {field}: {error}").format(field=_(field), error=errors[0])
                if "non_field_errors" in data:
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
        response = {"status": True, "message": None, "data": data or []}

        if renderer_context:
            status_code = renderer_context["response"].status_code
            errors_data = None
            if not str(status_code).startswith("2"):
                import copy

                try:
                    errors_data = copy.deepcopy(data)
                except Exception:
                    errors_data = data

            message = extract_detail_message(data, status_code)
            response["message"] = message

            if not str(status_code).startswith("2"):
                response["status"] = False
                response["errors"] = errors_data if isinstance(errors_data, (dict, list)) else None
                response["data"] = []

        return super().render(response, accepted_media_type, renderer_context)
