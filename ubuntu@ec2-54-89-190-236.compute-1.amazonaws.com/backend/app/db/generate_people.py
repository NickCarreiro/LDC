import random
from datetime import date

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.operations import (
    DateHistory,
    MatchDraft,
    MatchSource,
    MatchStatus,
    Participant,
    ProgramSession,
    RegistrationStatus,
    SessionRegistration,
    VisionStatementVersion,
)
from app.services.intake_form_templates import INTERESTS, get_summer_2026_signup_form
from app.services.matching import score_pair

BATCH = "synthetic-2026-05-12-v1"
TARGET_SYNTHETIC_PEOPLE = 250
RANDOM_SEED = 20260512

FIRST_NAMES_WOMEN = [
    "Abigail",
    "Adriana",
    "Alicia",
    "Angela",
    "Anne",
    "Beatrice",
    "Bethany",
    "Bridget",
    "Catherine",
    "Cecilia",
    "Claire",
    "Clara",
    "Colette",
    "Diana",
    "Elena",
    "Elizabeth",
    "Emily",
    "Erin",
    "Felicity",
    "Frances",
    "Gabriella",
    "Grace",
    "Hannah",
    "Isabel",
    "Joanna",
    "Julia",
    "Katherine",
    "Laura",
    "Leah",
    "Lucy",
    "Madeleine",
    "Maria",
    "Miriam",
    "Monica",
    "Natalie",
    "Olivia",
    "Rachel",
    "Rebecca",
    "Rose",
    "Sarah",
    "Sofia",
    "Teresa",
    "Theresa",
    "Veronica",
]

FIRST_NAMES_MEN = [
    "Adam",
    "Andrew",
    "Anthony",
    "Benjamin",
    "Brendan",
    "Caleb",
    "Charles",
    "Christopher",
    "Daniel",
    "David",
    "Dominic",
    "Edward",
    "Elias",
    "Francis",
    "Gabriel",
    "George",
    "Isaac",
    "James",
    "Jeremiah",
    "John",
    "Joseph",
    "Joshua",
    "Leo",
    "Lucas",
    "Mark",
    "Matthew",
    "Michael",
    "Nathan",
    "Nicholas",
    "Patrick",
    "Peter",
    "Philip",
    "Samuel",
    "Stephen",
    "Thomas",
    "Timothy",
    "Vincent",
    "William",
    "Xavier",
    "Zachary",
]

LAST_NAMES = [
    "Adams",
    "Allen",
    "Baker",
    "Bennett",
    "Brooks",
    "Burke",
    "Callahan",
    "Campbell",
    "Carroll",
    "Casey",
    "Clark",
    "Collins",
    "Cook",
    "Cooper",
    "Cruz",
    "Davis",
    "Diaz",
    "Doyle",
    "Edwards",
    "Evans",
    "Fisher",
    "Flores",
    "Garcia",
    "Gomez",
    "Gonzalez",
    "Green",
    "Hall",
    "Harris",
    "Hayes",
    "Hernandez",
    "Hill",
    "Howard",
    "Hughes",
    "James",
    "Johnson",
    "Kelly",
    "Kim",
    "King",
    "Lee",
    "Lewis",
    "Lopez",
    "Martin",
    "Martinez",
    "Miller",
    "Mitchell",
    "Moore",
    "Morgan",
    "Murphy",
    "Nelson",
    "Nguyen",
    "O'Brien",
    "Parker",
    "Patel",
    "Perez",
    "Peterson",
    "Phillips",
    "Ramirez",
    "Reed",
    "Rivera",
    "Roberts",
    "Rodriguez",
    "Rossi",
    "Russell",
    "Sanchez",
    "Scott",
    "Smith",
    "Stewart",
    "Taylor",
    "Thomas",
    "Thompson",
    "Torres",
    "Turner",
    "Walker",
    "Walsh",
    "Ward",
    "Watson",
    "White",
    "Williams",
    "Wilson",
    "Wright",
    "Young",
]

LOCATIONS = [
    ("Washington", "DC"),
    ("Arlington", "VA"),
    ("Alexandria", "VA"),
    ("Falls Church", "VA"),
    ("Fairfax", "VA"),
    ("Vienna", "VA"),
    ("Reston", "VA"),
    ("Leesburg", "VA"),
    ("Rockville", "MD"),
    ("Bethesda", "MD"),
    ("Silver Spring", "MD"),
    ("Gaithersburg", "MD"),
    ("College Park", "MD"),
    ("Laurel", "MD"),
    ("Annapolis", "MD"),
    ("Frederick", "MD"),
]

VISION_TAGS = [
    "sacramental marriage",
    "children",
    "parish life",
    "service",
    "hospitality",
    "prayer",
    "simple living",
    "homeschooling",
    "classical education",
    "career balance",
    "community",
    "financial prudence",
    "mission",
    "family closeness",
]

VISION_OPENINGS = [
    "I hope to build a faithful Catholic home rooted in",
    "I see marriage as a vocation of mutual sanctification through",
    "My vision for family life is centered on",
    "I want a Christ-centered marriage marked by",
    "I am discerning marriage with a desire for",
    "I hope to share ordinary life with someone who values",
]

VISION_DETAILS = [
    "daily prayer, parish life, and openness to children.",
    "hospitality, service, and a stable home for raising a family.",
    "honest work, sacramental life, and generous involvement in community.",
    "clear communication, practical responsibility, and shared Catholic practice.",
    "simplicity, friendship, family closeness, and active parish commitment.",
    "raising children in the faith while balancing work, service, and family time.",
    "a home where faith is normal, meals are shared, and decisions are made with prudence.",
    "a marriage that supports holiness, friendship, service, and healthy family culture.",
]

REFERRAL_SOURCES = [
    "Friend from parish",
    "Young adult group",
    "Instagram",
    "Previous participant",
    "Catholic event",
    "Diocesan newsletter",
    "Roommate",
    "Sibling",
    "FOCUS missionary",
]

FEEDBACK_SNIPPETS = [
    "Positive communication and punctuality reported.",
    "Organizer should check schedule flexibility before assigning many dates.",
    "Participant prefers low-pressure coffee or walking dates.",
    "Prior feedback was neutral; no safety concerns recorded.",
    "Good follow-through in previous session.",
    "New participant; no feedback history yet.",
    "Asked thoughtful questions during orientation.",
]


def _dob_for_age(age: int, rng: random.Random) -> date:
    today = date(2026, 5, 12)
    birthday_passed = rng.choice([True, False])
    year = today.year - age if birthday_passed else today.year - age - 1
    month = rng.randint(1, 12)
    day = rng.randint(1, 28)
    return date(year, month, day)


def _age_range(age: int, rng: random.Random) -> tuple[int, int]:
    lower = max(18, age - rng.randint(2, 6))
    upper = min(35, age + rng.randint(2, 7))
    if lower > upper:
        lower, upper = upper, lower
    return lower, upper


def _vision(rng: random.Random) -> tuple[str, list[str]]:
    tags = rng.sample(VISION_TAGS, rng.randint(3, 5))
    statement = f"{rng.choice(VISION_OPENINGS)} {rng.choice(VISION_DETAILS)}"
    if "children" in tags and "children" not in statement:
        statement += " I am open to children and want to raise them in the Catholic faith."
    if "service" in tags and "service" not in statement:
        statement += " I hope service remains part of our family culture."
    return statement, tags


def _phone(index: int) -> str:
    return f"202-555-{1000 + index:04d}"


def _session_by_name(db, name: str, starts_on: date, location: str, open_for_registration: bool) -> ProgramSession:
    session = db.scalar(select(ProgramSession).where(ProgramSession.name == name))
    if session:
        return session
    session = ProgramSession(
        name=name,
        starts_on=starts_on,
        location_label=location,
        registration_open=open_for_registration,
        intake_form_config=get_summer_2026_signup_form() if name == "Summer 2026" else {},
        matching_rules={"max_special_needs_dates_per_woman": 1},
    )
    db.add(session)
    db.flush()
    return session


def _registration_status(gender: str, index: int, rng: random.Random) -> RegistrationStatus:
    if gender == "Man" and index % 9 == 0:
        return RegistrationStatus.waitlisted
    roll = rng.random()
    if roll < 0.72:
        return RegistrationStatus.accepted
    if roll < 0.84:
        return RegistrationStatus.fee_pending
    if roll < 0.95:
        return RegistrationStatus.received
    return RegistrationStatus.declined


def _payment_status(status: RegistrationStatus) -> str:
    if status == RegistrationStatus.accepted:
        return "paid"
    if status == RegistrationStatus.fee_pending:
        return "pending"
    return "unpaid"


def _existing_batch_people(db) -> list[Participant]:
    people = db.scalars(select(Participant)).all()
    return [
        person
        for person in people
        if (person.flexible_fields or {}).get("generated_seed_batch") == BATCH
    ]


def _create_people(db, rng: random.Random, summer: ProgramSession, count: int) -> list[Participant]:
    generated: list[Participant] = []
    existing_count = len(_existing_batch_people(db))
    for offset in range(count):
        index = existing_count + offset + 1
        gender = "Woman" if index % 2 else "Man"
        first_pool = FIRST_NAMES_WOMEN if gender == "Woman" else FIRST_NAMES_MEN
        first_name = first_pool[(index + rng.randint(0, len(first_pool) - 1)) % len(first_pool)]
        last_name = LAST_NAMES[(index * 7 + rng.randint(0, len(LAST_NAMES) - 1)) % len(LAST_NAMES)]
        age = rng.randint(18, 35)
        city, state = rng.choice(LOCATIONS)
        min_age, max_age = _age_range(age, rng)
        vision_statement, tags = _vision(rng)
        selected_interests = rng.sample(INTERESTS, rng.randint(3, 7))
        status = _registration_status(gender, index, rng)
        special_needs_flag = index % 23 == 0

        participant = Participant(
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            date_of_birth=_dob_for_age(age, rng),
            city=city,
            state=state,
            email=f"synthetic.{index:03d}@example.org",
            phone=_phone(index),
            profile_photo_url=f"/profiles/synthetic-{index:03d}.jpg",
            vision_statement=vision_statement,
            vision_tags={"tags": tags},
            interests=selected_interests,
            age_range_min=min_age,
            age_range_max=max_age,
            desired_dates_per_session=rng.randint(3, 12),
            special_needs_flag=special_needs_flag,
            special_needs_notes=(
                "Synthetic organizer-only support context for testing pastoral review workflows."
                if special_needs_flag
                else None
            ),
            registration_fee_status=_payment_status(status),
            flexible_fields={
                "generated_seed_batch": BATCH,
                "synthetic_index": index,
                "age_at_signup": age,
                "city_state_raw": f"{city}, {state}",
                "referral_source": rng.choice(REFERRAL_SOURCES),
                "orientation_required": index % 4 == 0,
                "orientation_rsvp": rng.choice(["not_sent", "sent", "confirmed"]),
                "zelle_or_venmo_reference": f"SYN-{index:04d}" if status == RegistrationStatus.accepted else None,
                "profile_quality": rng.choice(["complete", "needs_photo", "needs_vision_review"]),
            },
        )
        db.add(participant)
        db.flush()
        db.add(
            VisionStatementVersion(
                participant_id=participant.id,
                statement=vision_statement,
                tags={"tags": tags},
                reviewer_notes=rng.choice(FEEDBACK_SNIPPETS),
                created_by="seed.generator@example.org",
            )
        )
        db.add(
            SessionRegistration(
                session_id=summer.id,
                participant_id=participant.id,
                status=status,
                payment_reference=f"SYN-PAY-{index:04d}" if status == RegistrationStatus.accepted else None,
                signed_liability_statement=status != RegistrationStatus.received,
                signed_safety_statement=status != RegistrationStatus.received,
                feedback_summary=rng.choice(FEEDBACK_SNIPPETS),
                negative_feedback_flag=index % 37 == 0,
                organizer_notes=rng.choice(FEEDBACK_SNIPPETS),
            )
        )
        generated.append(participant)
    db.flush()
    return generated


def _add_repeat_session_data(db, rng: random.Random, people: list[Participant], sessions: list[ProgramSession]) -> None:
    for participant in people:
        if rng.random() > 0.34:
            continue
        prior_sessions = rng.sample(sessions, rng.randint(1, min(2, len(sessions))))
        for session in prior_sessions:
            db.add(
                SessionRegistration(
                    session_id=session.id,
                    participant_id=participant.id,
                    status=RegistrationStatus.accepted,
                    payment_reference=f"REPEAT-{participant.flexible_fields['synthetic_index']:04d}",
                    signed_liability_statement=True,
                    signed_safety_statement=True,
                    feedback_summary=rng.choice(FEEDBACK_SNIPPETS),
                    negative_feedback_flag=rng.random() < 0.08,
                    organizer_notes=rng.choice(FEEDBACK_SNIPPETS),
                )
            )


def _add_constraints(db, rng: random.Random, people: list[Participant]) -> None:
    for participant in people:
        if rng.random() > 0.22:
            continue
        possible = [person for person in people if person.id != participant.id and person.gender != participant.gender]
        blocked = rng.sample(possible, rng.randint(1, min(3, len(possible))))
        participant.cannot_date_participant_ids = [str(person.id) for person in blocked]
        participant.flexible_fields = {
            **(participant.flexible_fields or {}),
            "cannot_date_raw": ", ".join(f"{person.first_name} {person.last_name}" for person in blocked),
        }


def _add_date_history(db, rng: random.Random, people: list[Participant], prior_sessions: list[ProgramSession]) -> None:
    women = [person for person in people if person.gender == "Woman"]
    men = [person for person in people if person.gender == "Man"]
    rng.shuffle(women)
    rng.shuffle(men)
    outcomes = ["completed", "no mutual interest", "follow-up planned", "schedule conflict", "positive feedback"]
    for index, (woman, man) in enumerate(zip(women[:90], men[:90])):
        db.add(
            DateHistory(
                session_id=rng.choice(prior_sessions).id,
                participant_a_id=woman.id,
                participant_b_id=man.id,
                outcome=rng.choice(outcomes),
                feedback=rng.choice(FEEDBACK_SNIPPETS),
                organizer_notes=rng.choice(FEEDBACK_SNIPPETS),
            )
        )
        if index % 3 == 0:
            woman.flexible_fields = {
                **(woman.flexible_fields or {}),
                "previous_dates_raw": f"{man.first_name} {man.last_name}",
            }
            man.flexible_fields = {
                **(man.flexible_fields or {}),
                "previous_dates_raw": f"{woman.first_name} {woman.last_name}",
            }


def _add_match_drafts(db, rng: random.Random, people: list[Participant], summer: ProgramSession) -> None:
    women = [person for person in people if person.gender == "Woman"]
    men = [person for person in people if person.gender == "Man"]
    rng.shuffle(women)
    rng.shuffle(men)
    for index, (woman, man) in enumerate(zip(women[:45], men[:45])):
        score = score_pair(db, woman, man)
        status = MatchStatus.approved if index % 5 == 0 else MatchStatus.draft
        if score.warnings:
            status = MatchStatus.draft
        db.add(
            MatchDraft(
                session_id=summer.id,
                participant_a_id=woman.id,
                participant_b_id=man.id,
                source=MatchSource.algorithm if index % 2 else MatchSource.manual,
                status=status,
                score=score.score,
                score_breakdown={**score.breakdown, "warnings": score.warnings},
                curator_notes=rng.choice(FEEDBACK_SNIPPETS),
                email_subject="Your curated date information" if status == MatchStatus.approved else None,
                email_body=(
                    f"Hello {woman.first_name}, your curated date is {man.first_name} {man.last_name}."
                    if status == MatchStatus.approved
                    else None
                ),
            )
        )


def main(target: int = TARGET_SYNTHETIC_PEOPLE) -> None:
    rng = random.Random(RANDOM_SEED)
    with SessionLocal() as db:
        summer = _session_by_name(
            db,
            "Summer 2026",
            date(2026, 6, 3),
            "Maryland/DC/Northern VA",
            True,
        )
        spring = _session_by_name(db, "Spring 2026", date(2026, 3, 5), "DMV area", False)
        winter = _session_by_name(db, "Winter 2026", date(2026, 1, 7), "DMV area", False)

        existing = _existing_batch_people(db)
        missing = max(0, target - len(existing))
        if missing:
            created = _create_people(db, rng, summer, missing)
            db.flush()
            people = existing + created
            _add_repeat_session_data(db, rng, people, [spring, winter])
            _add_constraints(db, rng, people)
            db.flush()
            _add_date_history(db, rng, people, [spring, winter])
            _add_match_drafts(db, rng, people, summer)
            db.commit()
            print(f"Generated {missing} synthetic participants in batch {BATCH}.")
        else:
            people = existing
            print(f"Batch {BATCH} already has {len(existing)} synthetic participants; no new people added.")

        total_people = len(db.scalars(select(Participant)).all())
        total_registrations = len(db.scalars(select(SessionRegistration)).all())
        total_dates = len(db.scalars(select(DateHistory)).all())
        total_drafts = len(db.scalars(select(MatchDraft)).all())
        print(
            "Database totals: "
            f"{total_people} participants, {total_registrations} registrations, "
            f"{total_dates} date-history records, {total_drafts} match drafts."
        )


if __name__ == "__main__":
    main()
