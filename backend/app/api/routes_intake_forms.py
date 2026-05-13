from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.models.operations import StaffRole
from app.schemas.operations import CurrentUser
from app.services.intake_form_templates import get_summer_2026_signup_form

router = APIRouter(prefix="/intake-forms", tags=["intake forms"])


@router.get("/templates/summer-2026")
def get_summer_2026_template(
    user: CurrentUser = Depends(require_roles(StaffRole.super_admin, StaffRole.organizer, StaffRole.matcher)),
):
    return get_summer_2026_signup_form()
