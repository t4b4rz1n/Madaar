import json
from unittest import TestCase
from unittest.mock import MagicMock

from config.renderers import ApiRenderer


class ApiRendererTestCase(TestCase):
    def setUp(self):
        self.renderer = ApiRenderer()

    def _render(self, data, status_code=200):
        mock_response = MagicMock()
        mock_response.status_code = status_code
        context = {"response": mock_response}
        rendered_bytes = self.renderer.render(data, renderer_context=context)
        return json.loads(rendered_bytes.decode("utf-8"))

    def test_render_dict_preserves_dict_type(self):
        result = self._render({}, status_code=200)
        self.assertTrue(result["status"])
        self.assertEqual(result["data"], {})
        self.assertIsInstance(result["data"], dict)

    def test_render_boolean_false_preserves_bool_type(self):
        result = self._render(False, status_code=200)
        self.assertTrue(result["status"])
        self.assertEqual(result["data"], False)
        self.assertIsInstance(result["data"], bool)

    def test_render_list_preserves_list_type(self):
        result = self._render([1, 2, 3], status_code=200)
        self.assertTrue(result["status"])
        self.assertEqual(result["data"], [1, 2, 3])
        self.assertIsInstance(result["data"], list)

    def test_render_error_response_400(self):
        error_payload = {"username": ["This field is required."]}
        result = self._render(error_payload, status_code=400)
        self.assertFalse(result["status"])
        self.assertEqual(result["errors"], error_payload)
        self.assertIsNone(result["data"])
        self.assertTrue(
            "username" in result["message"] or "نام کاربری" in result["message"]
        )


    def test_render_already_formatted_envelope(self):
        already_wrapped = {
            "status": True,
            "message": "Custom Message",
            "data": {"key": "value"},
        }
        result = self._render(already_wrapped, status_code=200)
        self.assertEqual(result, already_wrapped)
