#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Link-in-Bio Platform with Supabase Integration
Tests all authentication, profile management, link CRUD, and public API endpoints
"""

import requests
import json
import uuid
import time
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

class LinkInBioTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_data = {
            "email": f"testuser{uuid.uuid4().hex[:8]}@gmail.com",
            "password": "TestPassword123!",
            "username": f"testuser{uuid.uuid4().hex[:8]}",
            "displayName": "Test User Display"
        }
        self.auth_token = None
        self.user_id = None
        self.created_links = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")

    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=default_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=default_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=default_headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=default_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_auth_signup(self):
        """Test user registration endpoint"""
        print("\n=== Testing Authentication - Signup ===")
        
        # Test successful signup
        response = self.make_request("POST", "/auth/signup", self.test_user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and data["user"]:
                self.user_id = data["user"]["id"]
                self.log_result("User Signup", True, f"User created with ID: {self.user_id}")
            else:
                self.log_result("User Signup", False, "No user data in response")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("User Signup", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test duplicate username
        duplicate_data = self.test_user_data.copy()
        duplicate_data["email"] = f"another_{uuid.uuid4().hex[:8]}@example.com"
        response = self.make_request("POST", "/auth/signup", duplicate_data)
        
        if response and response.status_code == 400:
            error_data = response.json()
            if "Username already taken" in error_data.get("error", ""):
                self.log_result("Duplicate Username Prevention", True, "Correctly rejected duplicate username")
            else:
                self.log_result("Duplicate Username Prevention", False, f"Wrong error message: {error_data.get('error')}")
        else:
            self.log_result("Duplicate Username Prevention", False, f"Expected 400 status, got {response.status_code if response else 'None'}")

        # Test missing fields
        incomplete_data = {"email": "test@example.com", "password": "password"}
        response = self.make_request("POST", "/auth/signup", incomplete_data)
        
        if response and response.status_code == 400:
            self.log_result("Missing Fields Validation", True, "Correctly rejected incomplete data")
        else:
            self.log_result("Missing Fields Validation", False, f"Expected 400 status, got {response.status_code if response else 'None'}")

    def test_auth_signin(self):
        """Test user login endpoint"""
        print("\n=== Testing Authentication - Signin ===")
        
        # Test signin with unconfirmed email (expected behavior with Supabase)
        signin_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
        response = self.make_request("POST", "/auth/signin", signin_data)
        
        if response and response.status_code == 400:
            data = response.json()
            if "Email not confirmed" in data.get("error", ""):
                self.log_result("User Signin - Email Confirmation Required", True, "Correctly requires email confirmation")
            else:
                self.log_result("User Signin", False, f"Unexpected error: {data.get('error')}")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("User Signin", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test invalid credentials
        invalid_data = {
            "email": "nonexistent@gmail.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/signin", invalid_data)
        
        if response and response.status_code == 400:
            self.log_result("Invalid Credentials", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid Credentials", False, f"Expected 400 status, got {response.status_code if response else 'None'}")

    def test_profile_management(self):
        """Test profile CRUD operations"""
        print("\n=== Testing Profile Management ===")
        
        # Test get profile
        response = self.make_request("GET", "/profile")
        
        if response and response.status_code == 200:
            profile_data = response.json()
            if profile_data and "username" in profile_data:
                self.log_result("Get Profile", True, f"Retrieved profile for username: {profile_data['username']}")
            else:
                self.log_result("Get Profile", False, "Profile data missing or incomplete")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Get Profile", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test update profile
        update_data = {
            "displayName": "Updated Display Name",
            "bio": "This is my updated bio for testing",
            "avatarUrl": "https://example.com/avatar.jpg",
            "themeColor": "#3B82F6",
            "backgroundColor": "#F3F4F6"
        }
        
        response = self.make_request("POST", "/profile", update_data)
        
        if response and response.status_code == 200:
            updated_profile = response.json()
            if updated_profile.get("display_name") == update_data["displayName"]:
                self.log_result("Update Profile", True, "Profile updated successfully")
            else:
                self.log_result("Update Profile", False, "Profile update data mismatch")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Update Profile", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test username uniqueness in update
        existing_username_data = {"username": "admin"}  # Assuming this might exist
        response = self.make_request("POST", "/profile", existing_username_data)
        
        # This should either succeed (if username is available) or fail with proper error
        if response:
            if response.status_code == 200:
                self.log_result("Username Update", True, "Username update succeeded")
            elif response.status_code == 400 and "already taken" in response.json().get("error", ""):
                self.log_result("Username Uniqueness Check", True, "Correctly prevented duplicate username")
            else:
                self.log_result("Username Update", False, f"Unexpected response: {response.status_code}")
        else:
            self.log_result("Username Update", False, "No response received")

    def test_link_crud_operations(self):
        """Test link CRUD operations"""
        print("\n=== Testing Link CRUD Operations ===")
        
        # Test create link
        link_data = {
            "title": "Test Link 1",
            "url": "https://example.com",
            "description": "This is a test link"
        }
        
        response = self.make_request("POST", "/links", link_data)
        
        if response and response.status_code == 200:
            created_link = response.json()
            if created_link and "id" in created_link:
                self.created_links.append(created_link["id"])
                self.log_result("Create Link", True, f"Link created with ID: {created_link['id']}")
            else:
                self.log_result("Create Link", False, "No link ID in response")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Create Link", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Create another link for testing
        link_data2 = {
            "title": "Test Link 2",
            "url": "https://github.com",
            "description": "Another test link"
        }
        
        response = self.make_request("POST", "/links", link_data2)
        if response and response.status_code == 200:
            created_link2 = response.json()
            if created_link2 and "id" in created_link2:
                self.created_links.append(created_link2["id"])

        # Test get links
        response = self.make_request("GET", "/links")
        
        if response and response.status_code == 200:
            links = response.json()
            if isinstance(links, list) and len(links) >= 1:
                self.log_result("Get Links", True, f"Retrieved {len(links)} links")
            else:
                self.log_result("Get Links", False, "No links returned or invalid format")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Get Links", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test update link
        if self.created_links:
            link_id = self.created_links[0]
            update_data = {
                "title": "Updated Test Link",
                "url": "https://updated-example.com",
                "description": "Updated description"
            }
            
            response = self.make_request("PUT", f"/links/{link_id}", update_data)
            
            if response and response.status_code == 200:
                updated_link = response.json()
                if updated_link.get("title") == update_data["title"]:
                    self.log_result("Update Link", True, "Link updated successfully")
                else:
                    self.log_result("Update Link", False, "Link update data mismatch")
            else:
                error_msg = response.json().get("error", "Unknown error") if response else "No response"
                self.log_result("Update Link", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test link validation
        invalid_link_data = {"title": "Invalid Link"}  # Missing URL
        response = self.make_request("POST", "/links", invalid_link_data)
        
        if response and response.status_code == 400:
            self.log_result("Link Validation", True, "Correctly rejected invalid link data")
        else:
            self.log_result("Link Validation", False, f"Expected 400 status, got {response.status_code if response else 'None'}")

    def test_public_profile_api(self):
        """Test public profile endpoint"""
        print("\n=== Testing Public Profile API ===")
        
        # Test get public profile
        username = self.test_user_data["username"]
        response = self.make_request("GET", f"/public/profile/{username}")
        
        if response and response.status_code == 200:
            public_data = response.json()
            if "profile" in public_data and "links" in public_data:
                profile = public_data["profile"]
                links = public_data["links"]
                if profile.get("username") == username:
                    self.log_result("Public Profile API", True, f"Retrieved public profile with {len(links)} links")
                else:
                    self.log_result("Public Profile API", False, "Username mismatch in public profile")
            else:
                self.log_result("Public Profile API", False, "Missing profile or links data")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Public Profile API", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test non-existent profile
        response = self.make_request("GET", "/public/profile/nonexistentuser123")
        
        if response and response.status_code == 404:
            self.log_result("Non-existent Profile", True, "Correctly returned 404 for non-existent profile")
        else:
            self.log_result("Non-existent Profile", False, f"Expected 404 status, got {response.status_code if response else 'None'}")

        # Test empty username
        response = self.make_request("GET", "/public/profile/")
        
        if response and response.status_code in [400, 404]:
            self.log_result("Empty Username", True, "Correctly handled empty username")
        else:
            self.log_result("Empty Username", False, f"Expected 400/404 status, got {response.status_code if response else 'None'}")

    def test_click_tracking(self):
        """Test link click tracking"""
        print("\n=== Testing Click Tracking ===")
        
        if not self.created_links:
            self.log_result("Click Tracking", False, "No links available for testing")
            return

        # Test track click
        link_id = self.created_links[0]
        click_data = {
            "linkId": link_id,
            "userId": self.user_id
        }
        
        response = self.make_request("POST", "/track-click", click_data)
        
        if response and response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log_result("Track Click", True, "Click tracked successfully")
            else:
                self.log_result("Track Click", False, "Success flag not set in response")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("Track Click", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

        # Test invalid link ID
        invalid_click_data = {"linkId": "invalid-id"}
        response = self.make_request("POST", "/track-click", invalid_click_data)
        
        # This should still return success as per the implementation (it just logs errors)
        if response and response.status_code == 200:
            self.log_result("Invalid Link Click", True, "Handled invalid link ID gracefully")
        else:
            self.log_result("Invalid Link Click", False, f"Unexpected response: {response.status_code if response else 'None'}")

        # Test missing link ID
        response = self.make_request("POST", "/track-click", {})
        
        if response and response.status_code == 400:
            self.log_result("Missing Link ID", True, "Correctly rejected missing link ID")
        else:
            self.log_result("Missing Link ID", False, f"Expected 400 status, got {response.status_code if response else 'None'}")

    def test_authentication_protection(self):
        """Test that protected endpoints require authentication"""
        print("\n=== Testing Authentication Protection ===")
        
        # Create a new session without authentication
        unauth_session = requests.Session()
        
        # Test protected endpoints
        protected_endpoints = [
            ("GET", "/profile"),
            ("POST", "/profile", {"displayName": "Test"}),
            ("GET", "/links"),
            ("POST", "/links", {"title": "Test", "url": "https://example.com"}),
        ]
        
        for method, endpoint, *data in protected_endpoints:
            request_data = data[0] if data else None
            
            try:
                url = f"http://localhost:3000/api{endpoint}"
                if method == "GET":
                    response = unauth_session.get(url, timeout=10)
                elif method == "POST":
                    response = unauth_session.post(url, json=request_data, timeout=10)
                
                if response and response.status_code == 401:
                    self.log_result(f"Auth Protection - {method} {endpoint}", True, "Correctly rejected unauthenticated request")
                else:
                    self.log_result(f"Auth Protection - {method} {endpoint}", False, f"Expected 401, got {response.status_code if response else 'None'}")
            except Exception as e:
                self.log_result(f"Auth Protection - {method} {endpoint}", False, f"Request failed: {str(e)}")

    def test_cors_headers(self):
        """Test CORS headers are present"""
        print("\n=== Testing CORS Headers ===")
        
        # Test OPTIONS request using requests.options
        try:
            response = requests.options(f"{API_BASE}/auth/signin", timeout=10)
            
            if response and response.status_code == 200:
                headers = response.headers
                cors_headers = [
                    "Access-Control-Allow-Origin",
                    "Access-Control-Allow-Methods", 
                    "Access-Control-Allow-Headers"
                ]
                
                missing_headers = [h for h in cors_headers if h not in headers]
                
                if not missing_headers:
                    self.log_result("CORS Headers", True, "All required CORS headers present")
                else:
                    self.log_result("CORS Headers", False, f"Missing headers: {missing_headers}")
            else:
                self.log_result("CORS Headers", False, f"OPTIONS request failed: {response.status_code if response else 'None'}")
        except Exception as e:
            self.log_result("CORS Headers", False, f"OPTIONS request error: {str(e)}")

    def test_signout(self):
        """Test user signout"""
        print("\n=== Testing Authentication - Signout ===")
        
        response = self.make_request("POST", "/auth/signout", {})
        
        if response and response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.log_result("User Signout", True, "Successfully signed out")
            else:
                self.log_result("User Signout", False, "Success flag not set")
        else:
            error_msg = response.json().get("error", "Unknown error") if response else "No response"
            self.log_result("User Signout", False, f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete created links
        for link_id in self.created_links:
            response = self.make_request("DELETE", f"/links/{link_id}")
            if response and response.status_code == 200:
                print(f"✅ Deleted link: {link_id}")
            else:
                print(f"❌ Failed to delete link: {link_id}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend Testing for Link-in-Bio Platform")
        print(f"📍 Testing against: {BASE_URL}")
        print(f"👤 Test user: {self.test_user_data['email']}")
        print("=" * 80)
        
        try:
            # Authentication tests
            self.test_auth_signup()
            self.test_auth_signin()
            
            # Profile management tests
            self.test_profile_management()
            
            # Link CRUD tests
            self.test_link_crud_operations()
            
            # Public API tests
            self.test_public_profile_api()
            
            # Click tracking tests
            self.test_click_tracking()
            
            # Security tests
            self.test_authentication_protection()
            
            # CORS tests
            self.test_cors_headers()
            
            # Signout test
            self.test_signout()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            self.test_results["errors"].append(f"Critical error: {str(e)}")
        
        finally:
            # Cleanup
            self.cleanup_test_data()
            
            # Print summary
            self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📈 Success Rate: {(self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed']) * 100):.1f}%")
        
        if self.test_results["errors"]:
            print("\n🔍 FAILED TESTS:")
            for error in self.test_results["errors"]:
                print(f"   • {error}")
        
        print("\n" + "=" * 80)
        
        if self.test_results["failed"] == 0:
            print("🎉 ALL TESTS PASSED! Backend is working correctly.")
        else:
            print("⚠️  Some tests failed. Please review the errors above.")

if __name__ == "__main__":
    tester = LinkInBioTester()
    tester.run_all_tests()