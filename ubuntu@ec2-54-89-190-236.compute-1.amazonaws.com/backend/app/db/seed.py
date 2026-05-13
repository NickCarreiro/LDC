from datetime import date

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.operations import Participant, ProgramSession, RegistrationStatus, SessionRegistration
from app.services.intake_form_templates import get_summer_2026_signup_form


def main() -> None:
    with SessionLocal() as db:
        existing = db.scalar(select(ProgramSession.id).limit(1))
        if existing:
            session = db.get(ProgramSession, existing)
            if session:
                session.intake_form_config = get_summer_2026_signup_form()
                db.commit()
            print("Seed data already present; updated intake form template.")
            return

        session = ProgramSession(
            name="May Discernment Dinner",
            starts_on=date(2026, 5, 30),
            location_label="Parish Hall",
            registration_open=True,
            intake_form_config=get_summer_2026_signup_form(),
            matching_rules={"max_special_needs_dates_per_woman": 1},
        )
        db.add(session)
        db.flush()

        participants = [
            Participant(
                first_name="Anna",
                last_name="M.",
                gender="Woman",
                date_of_birth=date(1997, 6, 15),
                city="Providence",
                state="RI",
                email="anna@example.org",
                phone="555-0101",
                vision_statement="I hope to build a faithful Catholic family rooted in parish life.",
                vision_tags={"tags": ["sacramental marriage", "large family", "parish life"]},
                interests=["Latin Mass", "hiking", "hospitality", "choir"],
                age_range_min=27,
                age_range_max=35,
                registration_fee_status="paid",
            ),
            Participant(
                first_name="Michael",
                last_name="R.",
                gender="Man",
                date_of_birth=date(1995, 3, 3),
                city="Boston",
                state="MA",
                email="michael@example.org",
                phone="555-0102",
                vision_statement="Marriage is a vocation of mutual sanctification and service.",
                vision_tags={"tags": ["sacramental marriage", "parish life", "homeschooling"]},
                interests=["hiking", "adoration", "choir", "classical education"],
                age_range_min=25,
                age_range_max=32,
                registration_fee_status="pending",
            ),
            Participant(
                first_name="Thomas",
                last_name="K.",
                gender="Man",
                date_of_birth=date(1998, 11, 22),
                city="Worcester",
                state="MA",
                email="thomas@example.org",
                phone="555-0103",
                vision_statement="I want a simple Catholic home marked by prayer and service.",
                vision_tags={"tags": ["sacramental marriage", "service", "simple living"]},
                interests=["theology", "running", "hospitality"],
                age_range_min=24,
                age_range_max=31,
                special_needs_flag=True,
                special_needs_notes="Organizer-only pastoral context.",
                registration_fee_status="paid",
            ),
        ]
        db.add_all(participants)
        db.flush()

        for participant in participants:
            db.add(
                SessionRegistration(
                    session_id=session.id,
                    participant_id=participant.id,
                    status=RegistrationStatus.accepted,
                    signed_liability_statement=True,
                    signed_safety_statement=True,
                )
            )

        db.commit()
        print("Seeded sample session and participants.")


if __name__ == "__main__":
    main()
