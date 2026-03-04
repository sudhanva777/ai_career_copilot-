"""interview upgrades: practice_mode + question_category

Revision ID: d3e5f7a9b1c4
Revises: c2d4e6f8a1b3
Create Date: 2026-03-04 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect

revision: str = 'd3e5f7a9b1c4'
down_revision: Union[str, None] = 'c2d4e6f8a1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)

    # 4b: practice mode flag on sessions — idempotent
    session_cols = [c['name'] for c in inspector.get_columns('interview_sessions')]
    if 'practice_mode' not in session_cols:
        op.add_column(
            'interview_sessions',
            sa.Column('practice_mode', sa.Boolean(), nullable=False, server_default='0'),
        )

    # 4c: question category on each QA row — idempotent
    qa_cols = [c['name'] for c in inspector.get_columns('interview_qa')]
    if 'question_category' not in qa_cols:
        op.add_column(
            'interview_qa',
            sa.Column('question_category', sa.String(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)

    qa_cols = [c['name'] for c in inspector.get_columns('interview_qa')]
    if 'question_category' in qa_cols:
        op.drop_column('interview_qa', 'question_category')

    session_cols = [c['name'] for c in inspector.get_columns('interview_sessions')]
    if 'practice_mode' in session_cols:
        op.drop_column('interview_sessions', 'practice_mode')
