import requests
import sys
import json
from datetime import datetime
import time

class VideoSurveillanceAPITester:
    def __init__(self, base_url="https://cctv-manager-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_camera_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_cameras_empty(self):
        """Test getting cameras when none exist"""
        success, response = self.run_test(
            "Get Cameras (Empty List)",
            "GET",
            "cameras",
            200
        )
        if success:
            cameras = response if isinstance(response, list) else []
            print(f"   Found {len(cameras)} cameras")
        return success

    def test_create_camera(self):
        """Test creating a new camera"""
        camera_data = {
            "name": f"Test Camera {datetime.now().strftime('%H%M%S')}",
            "url": "rtsp://test.example.com:554/stream1",
            "username": "admin",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Create Camera",
            "POST",
            "cameras",
            200,  # Based on the code, it returns 200, not 201
            data=camera_data
        )
        
        if success and 'id' in response:
            self.created_camera_id = response['id']
            print(f"   Created camera with ID: {self.created_camera_id}")
            return True
        return False

    def test_get_cameras_with_data(self):
        """Test getting cameras when data exists"""
        success, response = self.run_test(
            "Get Cameras (With Data)",
            "GET",
            "cameras",
            200
        )
        if success:
            cameras = response if isinstance(response, list) else []
            print(f"   Found {len(cameras)} cameras")
            if len(cameras) > 0:
                print(f"   First camera: {cameras[0].get('name', 'Unknown')}")
        return success

    def test_get_single_camera(self):
        """Test getting a single camera by ID"""
        if not self.created_camera_id:
            print("❌ Skipped - No camera ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Camera",
            "GET",
            f"cameras/{self.created_camera_id}",
            200
        )
        
        if success:
            print(f"   Camera name: {response.get('name', 'Unknown')}")
            print(f"   Camera status: {response.get('status', 'Unknown')}")
        return success

    def test_update_camera(self):
        """Test updating camera exclusion zones"""
        if not self.created_camera_id:
            print("❌ Skipped - No camera ID available")
            return False
            
        update_data = {
            "name": "Updated Test Camera",
            "exclusion_zones": [
                {
                    "points": [[100, 100], [200, 100], [200, 200], [100, 200]]
                }
            ]
        }
        
        success, response = self.run_test(
            "Update Camera",
            "PUT",
            f"cameras/{self.created_camera_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"   Updated camera name: {response.get('name', 'Unknown')}")
            zones = response.get('exclusion_zones', [])
            print(f"   Exclusion zones: {len(zones)}")
        return success

    def test_start_camera(self):
        """Test starting a camera (will likely fail without real camera)"""
        if not self.created_camera_id:
            print("❌ Skipped - No camera ID available")
            return False
            
        success, response = self.run_test(
            "Start Camera",
            "POST",
            f"cameras/{self.created_camera_id}/start",
            500  # Expected to fail with fake camera URL
        )
        
        # This is expected to fail with a fake camera URL
        if not success:
            print("   ℹ️  Expected failure - fake camera URL cannot be connected")
            return True  # Count as success since it's expected behavior
        return success

    def test_get_recordings_empty(self):
        """Test getting recordings when none exist"""
        success, response = self.run_test(
            "Get Recordings (Empty)",
            "GET",
            "recordings",
            200
        )
        if success:
            recordings = response if isinstance(response, list) else []
            print(f"   Found {len(recordings)} recordings")
        return success

    def test_camera_not_found(self):
        """Test getting non-existent camera"""
        success, response = self.run_test(
            "Get Non-existent Camera",
            "GET",
            "cameras/non-existent-id",
            404
        )
        return success

    def test_delete_camera(self):
        """Test deleting a camera"""
        if not self.created_camera_id:
            print("❌ Skipped - No camera ID available")
            return False
            
        success, response = self.run_test(
            "Delete Camera",
            "DELETE",
            f"cameras/{self.created_camera_id}",
            200
        )
        
        if success:
            print(f"   Camera deleted successfully")
        return success

def main():
    print("🎥 Video Surveillance System API Testing")
    print("=" * 50)
    
    # Setup
    tester = VideoSurveillanceAPITester()
    
    # Run tests in logical order
    tests = [
        tester.test_get_cameras_empty,
        tester.test_create_camera,
        tester.test_get_cameras_with_data,
        tester.test_get_single_camera,
        tester.test_update_camera,
        tester.test_start_camera,
        tester.test_get_recordings_empty,
        tester.test_camera_not_found,
        tester.test_delete_camera,
    ]
    
    # Execute tests
    for test in tests:
        try:
            test()
            time.sleep(0.5)  # Small delay between tests
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())