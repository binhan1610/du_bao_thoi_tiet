const url = 'https://add3e431b648.ngrok-free.app/api'

async function registerUser(data) {
    try {
        const response = await fetch(url + "/auth/register", {
            method: "POST",
            headers: {
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
        return { success: false, message: error.message };
    }
}

async function loginUser(data) {
    try {
        const response = await fetch(url + "/auth/login", {
            method: "POST",
            headers: {
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
        return { success: false, message: error.message };
    }
}
// api
async function apiRequest(method, path, data = null) {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("No access token found");

        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        };

        // Nếu có data (POST/PUT) thì thêm body
        if (data && (method === "POST" || method === "PUT")) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url + `${path}`, options);

        // Nếu token hết hạn → điều hướng về login
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return null;
        }

        // Nếu response không OK
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        // Trả về JSON
        return await response.json();

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}


async function updateDashboard() {
    try {
        // Gọi API bằng hàm dùng chung
        const data = await apiRequest("GET", "/data/latest?type=0");

        // Nếu bị 401 thì apiRequest đã redirect, data sẽ là null
        if (!data) return;

        // Cập nhật nhiệt độ
        const tempEl = document.querySelector('.stat-card.green .value');
        if (tempEl) tempEl.textContent = `${data.temperature}°C`;

        // Cập nhật độ ẩm
        const humidityEl = document.querySelector('.stat-card.blue .value');
        if (humidityEl) humidityEl.textContent = `${data.humidity}%`;

        // Cập nhật nồng độ CO2
        const coEl = document.querySelector('.stat-card.red .value');
        if (coEl) coEl.textContent = `${data.co_ppm} ppm`;

        // Cập nhật nồng độ bụi mịn
        const dustEl = document.querySelector('.stat-card.purple .value');
        if (dustEl) dustEl.textContent = `${data.dust_density} g/m³`;

        // Cập nhật tốc độ gió
        const windEl = document.querySelector('.stat-card.yellow .value');
        if (windEl) windEl.textContent = `${data.wind_speed} m/s`;

        // Cường độ UV
        const uvEl = document.querySelector('.stat-card.orange .value');
        if (uvEl) {
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


// Gọi 1 lần
updateDashboard();

setInterval(updateDashboard, 60 * 1000);


