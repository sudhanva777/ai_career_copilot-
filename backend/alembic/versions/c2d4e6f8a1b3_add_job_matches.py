"""add job_matches table

Revision ID: c2d4e6f8a1b3
Revises: b1c3e2f4a7d9
Create Date: 2026-03-04 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect

revision: str = 'c2d4e6f8a1b3'
down_revision: Union[str, None] = 'b1c3e2f4a7d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: skip if the table already exists (e.g. from create_all).
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    if 'job_matches' not in inspector.get_table_names():
        op.create_table(
            'job_matches',
            sa.Column('match_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('users.user_id', ondelete='CASCADE'),
                      nullable=False, index=True),
            sa.Column('resume_id', sa.Integer(),
                      sa.ForeignKey('resumes.resume_id', ondelete='CASCADE'),
                      nullable=False, index=True),
            sa.Column('jd_text', sa.Text(), nullable=True),
            sa.Column('jd_source', sa.String(), nullable=True),
            sa.Column('match_score', sa.Float(), nullable=True),
            sa.Column('matched_skills_json', sa.JSON(), nullable=True),
            sa.Column('missing_skills_json', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    if 'job_matches' in inspector.get_table_names():
        op.drop_table('job_matches')
