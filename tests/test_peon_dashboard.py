"""
PEON Dashboard Backend API Tests
Tests for: Authentication, Admin Panel (Features, Backup, Notifications, Audit), Servers
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://peonctl.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USERNAME = "testadmin"
TEST_PASSWORD = "Test1234!"


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == TEST_USERNAME
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful for user: {data['user']['username']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == TEST_USERNAME
        print(f"✓ Current user info retrieved: {data['username']}")
    
    def test_get_permissions(self):
        """Test getting user permissions"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get permissions
        response = requests.get(
            f"{BASE_URL}/api/auth/permissions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "role" in data
        assert "permissions" in data
        print(f"✓ Permissions retrieved for role: {data['role']}")


class TestFeatureToggles:
    """Feature toggles tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_features(self, auth_token):
        """Test getting feature flags"""
        response = requests.get(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check expected feature keys exist
        assert "chat" in data or isinstance(data, dict)
        print(f"✓ Features retrieved: {list(data.keys())}")
    
    def test_update_features_disable_chat(self, auth_token):
        """Test disabling chat feature"""
        # First get current features
        get_response = requests.get(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        current_features = get_response.json()
        
        # Disable chat
        current_features["chat"] = False
        response = requests.put(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=current_features
        )
        assert response.status_code == 200
        print("✓ Chat feature disabled")
        
        # Verify it's disabled
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.json()["chat"] == False
        print("✓ Chat feature verified as disabled")
    
    def test_update_features_enable_chat(self, auth_token):
        """Test enabling chat feature"""
        # First get current features
        get_response = requests.get(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        current_features = get_response.json()
        
        # Enable chat
        current_features["chat"] = True
        response = requests.put(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=current_features
        )
        assert response.status_code == 200
        print("✓ Chat feature enabled")
        
        # Verify it's enabled
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/features",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.json()["chat"] == True
        print("✓ Chat feature verified as enabled")


class TestBackupRestore:
    """Backup and restore tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_backups(self, auth_token):
        """Test listing backups"""
        response = requests.get(
            f"{BASE_URL}/api/backup/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Backups listed: {len(data)} backups found")
    
    def test_create_backup(self, auth_token):
        """Test creating a backup"""
        response = requests.post(
            f"{BASE_URL}/api/backup/create",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "filename" in data
        print(f"✓ Backup created: {data['filename']}")
        return data["filename"]
    
    def test_backup_appears_in_list(self, auth_token):
        """Test that created backup appears in list"""
        # Create a backup
        create_response = requests.post(
            f"{BASE_URL}/api/backup/create",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        filename = create_response.json()["filename"]
        
        # List backups
        list_response = requests.get(
            f"{BASE_URL}/api/backup/list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        backups = list_response.json()
        filenames = [b["filename"] for b in backups]
        assert filename in filenames
        print(f"✓ Backup {filename} appears in list")


class TestNotifications:
    """Notifications configuration tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_notification_status(self, auth_token):
        """Test getting notification status"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "discord" in data
        assert "email" in data
        print(f"✓ Notification status: Discord={data['discord']}, Email={data['email']}")
    
    def test_get_discord_config(self, auth_token):
        """Test getting Discord configuration"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/discord/config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        print(f"✓ Discord config retrieved: enabled={data.get('enabled')}")
    
    def test_get_email_config(self, auth_token):
        """Test getting Email configuration"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/email/config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        print(f"✓ Email config retrieved: enabled={data.get('enabled')}")


class TestAuditLog:
    """Audit log tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_audit_log(self, auth_token):
        """Test getting audit log entries"""
        response = requests.get(
            f"{BASE_URL}/api/admin/audit-log",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "counts" in data
        assert "total" in data
        print(f"✓ Audit log retrieved: {data['total']} total entries")
    
    def test_audit_log_has_entries(self, auth_token):
        """Test that audit log has entries after login"""
        response = requests.get(
            f"{BASE_URL}/api/admin/audit-log",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        # Should have at least login entries
        assert len(data["logs"]) > 0
        print(f"✓ Audit log has {len(data['logs'])} entries")


class TestOrchestrators:
    """Orchestrator/Server management tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_orchestrators(self, auth_token):
        """Test getting orchestrators list"""
        response = requests.get(
            f"{BASE_URL}/api/orchestrators",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Orchestrators retrieved: {len(data)} orchestrators")
        return data


class TestSystemFeatures:
    """System features endpoint tests"""
    
    def test_get_public_features(self):
        """Test getting public feature flags"""
        response = requests.get(f"{BASE_URL}/api/system/features")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Public features retrieved: {list(data.keys())}")
    
    def test_get_system_status(self):
        """Test getting system status"""
        response = requests.get(f"{BASE_URL}/api/system/status")
        assert response.status_code == 200
        data = response.json()
        assert "initialized" in data
        assert "has_admin" in data
        print(f"✓ System status: initialized={data['initialized']}, has_admin={data['has_admin']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
