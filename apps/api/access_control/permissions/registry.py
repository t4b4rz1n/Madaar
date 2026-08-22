from dataclasses import dataclass
from typing import Dict, Optional, Set


@dataclass(frozen=True)
class Permission:
    key: str
    description: str = ""


class PermissionRegistry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._permissions: Dict[str, Permission] = {}
        return cls._instance

    def register(self, permission: Permission) -> None:
        self._permissions[permission.key] = permission

    def get(self, key: str) -> Optional[Permission]:
        return self._permissions.get(key)

    def validate(self, key: str) -> bool:
        return key in self._permissions

    def list_permissions(self) -> Set[str]:
        return set(self._permissions.keys())
