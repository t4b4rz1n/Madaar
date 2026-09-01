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
                if (
                    "non_field_errors" in data
                    and isinstance(data["non_field_errors"], list)
                    and data["non_field_errors"]
                ):
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

            # RFC 9110: 204 No Content MUST NOT return a body or envelope
            if status_code == 204:
                return b""

            # Prevent double-wrapping if response is already formatted as an envelope
            if isinstance(data, dict) and "status" in data and ("data" in data or "errors" in data):
                return super().render(data, accepted_media_type, renderer_context)

            # Let DRF handle standard raw error structures
            if isinstance(data, dict) and "detail" in data:
                return super().render(data, accepted_media_type, renderer_context)

            # Normal success envelope wrapping
            if 200 <= status_code < 300:
                payload = {
                    "status": "success",
                    "code": status_code,
                    "data": data,
                }
                return super().render(payload, accepted_media_type, renderer_context)

            return super().render(data, accepted_media_type, renderer_context)
