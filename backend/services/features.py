import json
from typing import Optional
from core.database import get_db
from core.config import DEFAULT_FEATURES

class FeatureService:
    """Service for managing feature flags"""
    
    CONFIG_KEY = 'feature_flags'
    
    @staticmethod
    def get_features() -> dict:
        """Get all feature flags"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT value FROM system_config WHERE key = ?", (FeatureService.CONFIG_KEY,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return json.loads(row[0])
        return DEFAULT_FEATURES.copy()
    
    @staticmethod
    def update_features(features: dict) -> dict:
        """Update feature flags"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Merge with defaults
        current = FeatureService.get_features()
        current.update(features)
        
        cursor.execute('''
            INSERT OR REPLACE INTO system_config (key, value)
            VALUES (?, ?)
        ''', (FeatureService.CONFIG_KEY, json.dumps(current)))
        
        conn.commit()
        conn.close()
        
        return current
    
    @staticmethod
    def is_enabled(feature: str) -> bool:
        """Check if a feature is enabled"""
        features = FeatureService.get_features()
        return features.get(feature, DEFAULT_FEATURES.get(feature, True))
