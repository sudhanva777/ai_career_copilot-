"""init

Revision ID: 23dccde9f1d4
Revises: 
Create Date: 2026-03-03 09:36:14.955077

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23dccde9f1d4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.models.base import Base
    import app.models.user
    import app.models.resume
    import app.models.analysis
    import app.models.interview
    Base.metadata.create_all(bind=op.get_bind())

def downgrade() -> None:
    from app.models.base import Base
    Base.metadata.drop_all(bind=op.get_bind())
