from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.operations import AuditLog, StaffRole
from app.schemas.operations import CurrentUser


def get_current_user(
    x_dev_user: str | None = Header(default=None),
    x_dev_role: StaffRole | None = Header(default=None),
) -> CurrentUser:
    settings = get_settings()
    if settings.dev_auth_enabled:
        return CurrentUser(
            email=x_dev_user or "local.organizer@example.org",
            role=x_dev_role or StaffRole.super_admin,
        )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="OIDC token validation is reserved for the deployment phase.",
    )


def require_roles(*roles: StaffRole) -> Callable:
    def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency


def audit(
    db: Session,
    actor: CurrentUser,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_email=str(actor.email),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata or {},
        )
    )
