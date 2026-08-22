from abc import ABC, abstractmethod
from typing import Set


class RoleProvider(ABC):
    @abstractmethod
    def get_roles(self, user, context: dict) -> Set[str]:
        pass


class RolePermissionProvider(ABC):
    @abstractmethod
    def get_permissions_for_role(self, role: str) -> Set[str]:
        pass
