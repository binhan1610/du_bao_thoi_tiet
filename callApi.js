// ================== CONFIG CHUNG ==================
const API_BASE_URL = 'https://add3e431b648.ngrok-free.app/api';

// Header bắt buộc để bypass ERR_NGROK_6024 của ngrok
const NGROK_HEADERS = {
    'ngrok-skip-browser-warning': '69420'
};

// ================== AUTH: REGISTER ==================
async function registerUser(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                ...NGROK_HEADERS,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const text = await response.text(); // server trả về text

        if (!response.ok) {
            return { success: false, message: text };
        }

        return { success: true, message: text };

    } catch (error) {
        console.error("Register error:", error);
        return { success: false, message: error.message };
    }
}

// ================== AUTH: LOGIN ==================
async function loginUser(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                ...NGROK_HEADERS,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.text();
            return { success: false, message: err };
        }

        const result = await response.json();
        return { success: true, data: result };

    } catch (error) {
        console.error("Login error:", error);
        return { success: false, message: error.message };
    }
}

// ================== HÀM DÙNG CHUNG GỌI API ==================
async function apiRequest(method, path, data = null) {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("No access token found");

        const headers = {
            ...NGROK_HEADERS,
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };

        const options = {
            method: method,
            headers: headers
        };

        // Nếu có data (POST/PUT) thì thêm body
        if (data && (method === "POST" || method === "PUT")) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${path}`, options);

        // Nếu token hết hạn → điều hướng về login
        if (response.status === 401) {
            console.warn("Token expired, redirect to login");
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return null;
        }

        // Nếu response không OK
        if (!response.ok) {
            const errText = await response.text();
            console.error(`HTTP ${response.status}:`, errText);
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        // Luôn đọc text trước rồi cố parse JSON
        const rawText = await response.text();

        try {
            const json = JSON.parse(rawText);
            return json; // Trả JSON object
        } catch (e) {
            console.warn("Response is not valid JSON, raw text:", rawText);
            return rawText; // fallback: trả text nếu không phải JSON
        }

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// ================== DASHBOARD ==================
async function updateDashboard() {
    try {
        // Gọi API bằng hàm dùng chung
        const data = await apiRequest("GET", "/data/latest?type=0");

        // Nếu bị 401 thì apiRequest đã redirect, data sẽ là null
        if (!data) return;

        // Nếu apiRequest trả về text (không phải JSON) thì bỏ qua
        if (typeof data !== 'object') {
            console.error("Invalid data for dashboard (not JSON object):", data);
            return;
        }

        // Cập nhật nhiệt độ
        const tempEl = document.querySelector('.stat-card.green .value');
        if (tempEl && data.temperature !== undefined) {
            tempEl.textContent = `${data.temperature}°C`;
        }

        // Cập nhật độ ẩm
        const humidityEl = document.querySelector('.stat-card.blue .value');
        if (humidityEl && data.humidity !== undefined) {
            humidityEl.textContent = `${data.humidity}%`;
        }

        // Cập nhật nồng độ CO2
        const coEl = document.querySelector('.stat-card.red .value');
        if (coEl && data.co_ppm !== undefined) {
            coEl.textContent = `${data.co_ppm} ppm`;
        }

        // Cập nhật nồng độ bụi mịn
        const dustEl = document.querySelector('.stat-card.purple .value');
        if (dustEl && data.dust_density !== undefined) {
            dustEl.textContent = `${data.dust_density} g/m³`;
        }

        // Cập nhật tốc độ gió
        const windEl = document.querySelector('.stat-card.yellow .value');
        if (windEl && data.wind_speed !== undefined) {
            windEl.textContent = `${data.wind_speed} m/s`;
        }

        // Cường độ UV
        const uvEl = document.querySelector('.stat-card.orange .value');
        if (uvEl && data.uv_index !== undefined) {
            const uv = data.uv_index;
            let level = '';

            if (uv <= 2) level = 'Low';
            else if (uv <= 5) level = 'Moderate';
            else if (uv <= 7) level = 'High';
            else if (uv <= 10) level = 'Very High';
            else level = 'Extreme';

            uvEl.textContent = `${uv} (${level})`;
        }

        console.log('Dashboard updated successfully', data);
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

// Gọi 1 lần khi load trang
updateDashboard();

// Cập nhật mỗi 60s
setInterval(updateDashboard, 60 * 1000);
