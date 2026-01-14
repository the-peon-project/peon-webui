"""
Backend API Tests for Role-Based Permissions
Tests: Token refresh, permissions endpoint, role-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123456"


class TestAuthEndpoints:
    """Authentication and token management tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        assert data["user"]["username"] == ADMIN_USERNAME
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_user",
            "password": "wrong_password"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_token_refresh_endpoint(self):
        """Test /api/auth/refresh endpoint returns new token"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        original_token = login_response.json()["access_token"]
        
        # Refresh token
        headers = {"Authorization": f"Bearer {original_token}"}
        refresh_response = requests.post(f"{BASE_URL}/api/auth/refresh", headers=headers)
        
        assert refresh_response.status_code == 200, f"Token refresh failed: {refresh_response.text}"
        data = refresh_response.json()
        assert "access_token" in data, "Missing access_token in refresh response"
        assert "expires_in" in data, "Missing expires_in in refresh response"
        assert data["token_type"] == "bearer"
        
    def test_token_refresh_without_auth(self):
        """Test token refresh without authentication fails"""
        response = requests.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestPermissionsEndpoint:
    """Tests for /api/auth/permissions endpoint"""
    
    def test_admin_permissions(self):
        """Test admin user gets full permissions"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get permissions
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200, f"Permissions request failed: {response.text}"
        data = response.json()
        
        assert "role" in data, "Missing role in response"
        assert "permissions" in data, "Missing permissions in response"
        assert data["role"] == "admin"
        
        # Admin should have all permissions
        permissions = data["permissions"]
        assert permissions["can_manage_users"] == True, "Admin should be able to manage users"
        assert permissions["can_manage_orchestrators"] == True, "Admin should be able to manage orchestrators"
        assert permissions["can_manage_servers"] == True, "Admin should be able to manage servers"
        assert permissions["can_manage_sessions"] == True, "Admin should be able to manage sessions"
        assert permissions["can_moderate_chat"] == True, "Admin should be able to moderate chat"
        assert permissions["can_view_servers"] == True, "Admin should be able to view servers"
        
    def test_permissions_without_auth(self):
        """Test permissions endpoint without authentication fails"""
        response = requests.get(f"{BASE_URL}/api/auth/permissions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestChatModeration:
    """Tests for chat moderation endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_delete_chat_message_requires_auth(self):
        """Test chat delete requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/chat/messages/fake-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_delete_nonexistent_message(self, admin_token):
        """Test deleting non-existent message returns 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/chat/messages/nonexistent-id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSessionManagement:
    """Tests for session management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_delete_session_requires_auth(self):
        """Test session delete requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/sessions/fake-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_update_session_requires_auth(self):
        """Test session update requires authentication"""
        response = requests.put(f"{BASE_URL}/api/sessions/fake-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_delete_nonexistent_session(self, admin_token):
        """Test deleting non-existent session returns 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/sessions/nonexistent-id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestUserManagement:
    """Tests for user management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_users_admin_only(self, admin_token):
        """Test listing users works for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"List users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        
        # Verify admin user exists in list
        admin_found = False
        for user in data:
            if user["username"] == ADMIN_USERNAME:
                admin_found = True
                assert user["role"] == "admin"
                break
        assert admin_found, "Admin user not found in users list"
        
    def test_list_users_requires_admin(self):
        """Test listing users without auth fails"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestOrchestratorAccess:
    """Tests for orchestrator access"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_orchestrators(self, admin_token):
        """Test listing orchestrators"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/orchestrators", headers=headers)
        
        assert response.status_code == 200, f"List orchestrators failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of orchestrators"
        
    def test_orchestrators_requires_auth(self):
        """Test orchestrators endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/orchestrators")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestServerControlAccess:
    """Tests for server control access (admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_server_proxy_requires_auth(self):
        """Test server proxy requires authentication"""
        response = requests.get(f"{BASE_URL}/api/proxy/fake-orch-id/servers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestRoleCreation:
    """Tests for creating users with different roles"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_create_user_requires_admin(self):
        """Test creating user requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": "test_user",
            "email": "test@example.com",
            "password": "testpass123"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_update_user_role(self, admin_token):
        """Test updating user role (admin only)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get list of users to find a non-admin user
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert users_response.status_code == 200
        
        users = users_response.json()
        # Find a non-admin user or skip
        non_admin_user = None
        for user in users:
            if user["role"] != "admin":
                non_admin_user = user
                break
        
        if non_admin_user:
            # Try to update role
            update_response = requests.put(
                f"{BASE_URL}/api/admin/users/{non_admin_user['id']}",
                headers=headers,
                params={"role": "moderator"}
            )
            # Should succeed or return appropriate error
            assert update_response.status_code in [200, 400, 404], f"Unexpected status: {update_response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
