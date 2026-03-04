"""init

Revision ID: 23dccde9f1d4
Revises:
Create Date: 2026-03-03 09:36:14.955077

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision: str = '23dccde9f1d4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create the base schema tables if they do not already exist.

    All create_table calls are idempotent so that running
    `alembic upgrade head` after `Base.metadata.create_all()` (used by
    uvicorn on first startup) does not fail with "table already exists".
    """
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = inspector.get_table_names()

    # ── users ────────────────────────────────────────────────────────────────
    if 'users' not in existing:
        op.create_table(
            'users',
            sa.Column('user_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('email', sa.String(), nullable=False, unique=True, index=True),
            sa.Column('password_hash', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=True),
            sa.Column('role', sa.String(), nullable=True, server_default='User'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    # ── resumes ──────────────────────────────────────────────────────────────
    if 'resumes' not in existing:
        op.create_table(
            'resumes',
            sa.Column('resume_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('users.user_id', ondelete='CASCADE'),
                      nullable=True, index=True),
            sa.Column('filename', sa.String(), nullable=True),
            sa.Column('raw_text', sa.Text(), nullable=True),
            sa.Column('file_path', sa.String(), nullable=True),
            sa.Column('upload_date', sa.DateTime(), nullable=True),
        )

    # ── analysis ─────────────────────────────────────────────────────────────
    # rewrite_suggestions_json is intentionally absent — added by b1c3e2f4a7d9
    if 'analysis' not in existing:
        op.create_table(
            'analysis',
            sa.Column('analysis_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('resume_id', sa.Integer(),
                      sa.ForeignKey('resumes.resume_id', ondelete='CASCADE'),
                      nullable=True, index=True),
            sa.Column('ats_score', sa.Float(), nullable=True),
            sa.Column('skills_json', sa.JSON(), nullable=True),
            sa.Column('role_pred_json', sa.JSON(), nullable=True),
            sa.Column('gaps_json', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
        )

    # ── interview_sessions ───────────────────────────────────────────────────
    # practice_mode is intentionally absent — added by d3e5f7a9b1c4
    if 'interview_sessions' not in existing:
        op.create_table(
            'interview_sessions',
            sa.Column('session_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('users.user_id', ondelete='CASCADE'),
                      nullable=True, index=True),
            sa.Column('analysis_id', sa.Integer(),
                      sa.ForeignKey('analysis.analysis_id', ondelete='CASCADE'),
                      nullable=True, index=True),
            sa.Column('target_role', sa.String(), nullable=True),
            sa.Column('overall_score', sa.Float(), nullable=True),
            sa.Column('started_at', sa.DateTime(), nullable=True),
        )

    # ── interview_qa ─────────────────────────────────────────────────────────
    # question_category is intentionally absent — added by d3e5f7a9b1c4
    if 'interview_qa' not in existing:
        op.create_table(
            'interview_qa',
            sa.Column('qa_id', sa.Integer(), primary_key=True, index=True),
            sa.Column('session_id', sa.Integer(),
                      sa.ForeignKey('interview_sessions.session_id', ondelete='CASCADE'),
                      nullable=True, index=True),
            sa.Column('question_text', sa.Text(), nullable=True),
            sa.Column('user_answer', sa.Text(), nullable=True),
            sa.Column('ideal_answer', sa.Text(), nullable=True),
            sa.Column('similarity_score', sa.Float(), nullable=True),
            sa.Column('llm_feedback', sa.Text(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = inspector.get_table_names()

    # Drop in reverse FK dependency order; skip tables already gone
    for tbl in ('interview_qa', 'interview_sessions', 'analysis', 'resumes', 'users'):
        if tbl in existing:
            op.drop_table(tbl)
