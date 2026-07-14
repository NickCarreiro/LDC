import argparse
from datetime import date

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.operations import ProgramSession
from app.services.intake_form_templates import get_summer_2026_signup_form


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an LDC program session.")
    parser.add_argument("--name", required=True, help='Session name, for example "Fall 2026".')
    parser.add_argument("--starts-on", help="Start date in YYYY-MM-DD format.")
    parser.add_argument("--location", default="", help="Human-readable location label.")
    parser.add_argument(
        "--registration-open",
        action="store_true",
        help="Mark the session as open for registration.",
    )
    parser.add_argument(
        "--attach-default-intake",
        action="store_true",
        help="Attach the current default intake form template to this session.",
    )
    parser.add_argument(
        "--max-special-needs-dates-per-woman",
        type=int,
        default=1,
        help="Matching rule used by the curation workflow. Default: 1.",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        session = db.scalar(select(ProgramSession).where(ProgramSession.name == args.name))
        created = False
        if session is None:
            session = ProgramSession(name=args.name)
            db.add(session)
            created = True

        session.starts_on = _parse_date(args.starts_on)
        session.location_label = args.location or None
        session.registration_open = args.registration_open
        session.matching_rules = {
            **(session.matching_rules or {}),
            "max_special_needs_dates_per_woman": args.max_special_needs_dates_per_woman,
        }
        if args.attach_default_intake:
            session.intake_form_config = get_summer_2026_signup_form()

        db.commit()
        db.refresh(session)

    verb = "Created" if created else "Updated"
    print(f"{verb} session: {session.name} ({session.id})")


if __name__ == "__main__":
    main()
