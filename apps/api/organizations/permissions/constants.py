class OrganizationPermissions:
    VIEW = "organizations.view"
    CREATE = "organizations.create"
    UPDATE = "organizations.update"
    DELETE = "organizations.delete"
    ARCHIVE = "organizations.archive"
    RESTORE = "organizations.restore"


class MemberPermissions:
    REMOVE = "members.remove"
    CHANGE_ROLE = "members.change_role"
    TRANSFER_OWNERSHIP = "members.transfer_ownership"


class TeamPermissions:
    VIEW = "teams.view"
    CREATE = "teams.create"
    UPDATE = "teams.update"
    DELETE = "teams.delete"
    ASSIGN_LEAD = "teams.assign_lead"


class TeamMemberPermissions:
    VIEW = "team_members.view"
    ADD = "team_members.add"
    REMOVE = "team_members.remove"
    CHANGE_ROLE = "team_members.change_role"
