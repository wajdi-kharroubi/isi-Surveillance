from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class GradeConfig(Base):
    """Configuration du nombre de surveillances par grade"""
    __tablename__ = "grade_config"
    
    id = Column(Integer, primary_key=True, index=True)
    grade_code = Column(String(10), unique=True, nullable=False, index=True)
    grade_nom = Column(String(100), nullable=False)
    nb_surveillances = Column(Integer, nullable=False, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<GradeConfig {self.grade_code}: {self.nb_surveillances} surveillances>"
