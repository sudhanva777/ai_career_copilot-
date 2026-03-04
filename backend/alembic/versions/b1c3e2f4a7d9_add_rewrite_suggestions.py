"""add rewrite_suggestions_json to analysis

Revision ID: b1c3e2f4a7d9
Revises: 23dccde9f1d4
Create Date: 2026-03-03 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect

revision: str = 'b1c3e2f4a7d9'
down_revision: Union[str, None] = '23dccde9f1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: only add if the column is not already present.
    # This handles the case where main.py's create_all() already created
    # the analysis table with all current-model columns.
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = [c['name'] for c in inspector.get_columns('analysis')]
    if 'rewrite_suggestions_json' not in existing:
        op.add_column(
            'analysis',
            sa.Column('rewrite_suggestions_json', sa.JSON(), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = [c['name'] for c in inspector.get_columns('analysis')]
    if 'rewrite_suggestions_json' in existing:
        op.drop_column('analysis', 'rewrite_suggestions_json')
