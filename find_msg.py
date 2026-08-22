import re

with open("apps/api/locale/en/LC_MESSAGES/django.po", "r", encoding="utf-8") as f:
    content = f.read()

m = re.search(
    r'(msgid\s+"[^"]*وضعیت حساب کاربری.*?\n)msgstr\s+"(.*?)"', content, re.DOTALL
)
if m:
    print("FOUND:")
    print(m.group(1) + 'msgstr "' + m.group(2) + '"')
else:
    print("NOT FOUND")
