// ================== CONFIG CHUNG ==================
const API_BASE_URL = 'http://localhost:8080/api';
const API_KEY = "ca2b55cf0396ffe23776523b64cc1045";

async function registerUser(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
        console.error("Register error:", error);
        return { success: false, message: error.message };
    }
}

async function loginUser(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
        console.error("Login error:", error);
        return { success: false, message: error.message };
    }
}

async function apiRequest(method, path, data = null) {
    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("No access token found");

        const headers = {
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

    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

const LOG_LIMIT = 50;
let logOffset = 0;
let logLoading = false;
let logHasMore = true;

async function loadLogs(initial = false) {
    if (logLoading || !logHasMore) return;

    const container = document.getElementById('log-container');
    if (!container) return;

    logLoading = true;
    const oldScrollHeight = container.scrollHeight;

    try {
        const token = localStorage.getItem('token');

        const res = await fetch(
            `${API_BASE_URL}/data/log?&limit=${LOG_LIMIT}&offset=${logOffset}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                }
            }
        );

        if (!res.ok) {
            console.error('Load log error: HTTP', res.status);
            return;
        }

        const data = await res.json();


        if (data.length < LOG_LIMIT) {
            logHasMore = false;
        }

        logOffset += data.length;


        const fragment = document.createDocumentFragment();
        for (let i = data.length - 1; i >= 0; i--) {
            const item = data[i];

            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = item.data;

            fragment.appendChild(line);
        }

        if (container.children.length === 0) {
            container.appendChild(fragment);
            container.scrollTop = container.scrollHeight;
        } else {
            const firstChild = container.firstChild;
            container.insertBefore(fragment, firstChild);

            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
        }

    } catch (err) {
        console.error('Error loading logs:', err);
    } finally {
        logLoading = false;
    }
}

const SENSOR_TYPE = 0;
const SENSOR_PAGE_SIZE = 40;
let sensorCurrentPage = 1;
let sensorHasMore = true;

function formatNumber(value, digits) {
    if (typeof value === "number") return value.toFixed(digits);
    return value ?? "";
}

async function loadSensorTable(page = 1) {
    try {
        const offset = (page - 1) * SENSOR_PAGE_SIZE;
        const query = `type=${SENSOR_TYPE}&limit=${SENSOR_PAGE_SIZE}&offset=${offset}`;

        // Gọi API bằng hàm dùng chung
        const data = await apiRequest("GET", `/data/page?${query}`);

        // Nếu bị 401 thì apiRequest đã redirect, data sẽ là null
        if (!data) return;

        // Nếu apiRequest trả về text (không phải JSON) thì bỏ qua
        if (typeof data !== "object") {
            console.error("Invalid data for dashboard (not JSON object):", data);
            return;
        }

        if (!Array.isArray(data)) {
            console.error("Invalid data format (expected array):", data);
            return;
        }

        const tbody = document.getElementById("sensor_table_body");
        if (!tbody) return;

        // Xóa dữ liệu cũ
        tbody.innerHTML = "";

        // Duyệt list và tạo từng dòng
        data.forEach(item => {
            const tr = document.createElement("tr");

            const tdTime = document.createElement("td");
            tdTime.textContent = item.timestamp || "";
            tr.appendChild(tdTime);

            const tdTemp = document.createElement("td");
            tdTemp.textContent = formatNumber(item.temperature, 1);
            tr.appendChild(tdTemp);

            const tdHum = document.createElement("td");
            tdHum.textContent = formatNumber(item.humidity, 1);
            tr.appendChild(tdHum);

            const tdCO = document.createElement("td");
            tdCO.textContent = formatNumber(item.co_ppm, 2);
            tr.appendChild(tdCO);

            const tdDust = document.createElement("td");
            tdDust.textContent = formatNumber(item.dust_density, 2);
            tr.appendChild(tdDust);

            const tdWind = document.createElement("td");
            tdWind.textContent = formatNumber(item.wind_speed, 2);
            tr.appendChild(tdWind);

            const tdUV = document.createElement("td");
            tdUV.textContent = formatNumber(item.uv_index, 2);
            tr.appendChild(tdUV);

            tbody.appendChild(tr);
        });

        // ---- Cập nhật state phân trang ----
        sensorCurrentPage = page;
        sensorHasMore = data.length === SENSOR_PAGE_SIZE; // nếu ít hơn limit ⇒ trang cuối

        updateSensorPaginationUI();

    } catch (err) {
        console.error("Error loading sensor table:", err);
    }
}

function updateSensorPaginationUI() {
    const pageInfoEl = document.getElementById("sensor_page_info");
    const prevBtn = document.getElementById("sensor_prev_page");
    const nextBtn = document.getElementById("sensor_next_page");

    if (pageInfoEl) {
        pageInfoEl.textContent = `Trang ${sensorCurrentPage}`;
    }

    if (prevBtn) {
        prevBtn.disabled = sensorCurrentPage <= 1;
    }

    if (nextBtn) {
        // nếu không còn dữ liệu để next thì disable
        nextBtn.disabled = !sensorHasMore;
    }
}

// Gán event cho nút phân trang
document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("sensor_prev_page");
    const nextBtn = document.getElementById("sensor_next_page");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (sensorCurrentPage > 1) {
                loadSensorTable(sensorCurrentPage - 1);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (sensorHasMore) {
                loadSensorTable(sensorCurrentPage + 1);
            }
        });
    }

    // load trang đầu tiên
    loadSensorTable(1);
});

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('log-container');
    if (!container) return;

    loadLogs(true);

    container.addEventListener('scroll', () => {
        if (container.scrollTop <= 50) { // gần đỉnh
            loadLogs(false);
        }
    });
});

async function loadWeather() {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=Ha%20Noi,VN&appid=${API_KEY}&units=metric&lang=vi`
        );

        if (!response.ok) {
            console.error("Weather API error:", await response.text());
            return;
        }

        const data = await response.json();

        const widget = document.querySelector("#sidebar-widget .weather-widget");
        const locationEl = widget.querySelector(".location");
        const timeEl = widget.querySelector(".time");
        const iconEl = widget.querySelector(".weather-icon i");
        const tempEl = widget.querySelector(".temperature");
        const cloudsEl = widget.querySelector(".clouds");
        const sunEl = widget.querySelector(".sun");

        if (locationEl && data.name) {
            locationEl.textContent = data.name;
        }

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        if (timeEl) {
            timeEl.textContent = `${hh}:${mm}`;
        }

        if (tempEl && data.main && typeof data.main.temp !== "undefined") {
            tempEl.textContent = `${Math.round(data.main.temp)}°C`;
        }

        const clouds = data.clouds && typeof data.clouds.all !== "undefined"
            ? data.clouds.all
            : null;

        if (cloudsEl && clouds !== null) {
            cloudsEl.textContent = `Mây: ${clouds}%`;
        }

        if (sunEl && clouds !== null) {
            const sunPercent = Math.max(0, 100 - clouds);
            sunEl.textContent = `Nắng: ${sunPercent}%`;
        }

        if (iconEl && data.weather && data.weather[0]) {
            const main = data.weather[0].main.toLowerCase();

            iconEl.className = "";
            if (main.includes("cloud")) {
                iconEl.classList.add("bx", "bxs-cloud");
            } else if (main.includes("rain") || main.includes("drizzle")) {
                iconEl.classList.add("bx", "bxs-cloud-rain");
            } else if (main.includes("thunder")) {
                iconEl.classList.add("bx", "bxs-cloud-lightning");
            } else if (main.includes("snow")) {
                iconEl.classList.add("bx", "bxs-cloud-snow");
            } else if (main.includes("clear")) {
                iconEl.classList.add("bx", "bxs-sun");
            } else {

                iconEl.classList.add("bx", "bxs-sun");
            }
        }
    } catch (err) {
        console.error("Error while loading weather:", err);
    }
}

async function loadSystemInfo() {
    try {
        const data = await apiRequest("GET", "/data/latest?type=2");

        if (!data) return;

        if (typeof data !== 'object') {
            console.error("Invalid data for dashboard (not JSON object):", data);
            return;
        }

        // ----- CPU -----
        const cpuPercent = data.cpu_usage?.usage_percent ?? 0;
        document.getElementById("cpu_progress_bar").style.width = cpuPercent + "%";
        document.getElementById("cpu_percent").textContent = cpuPercent.toFixed(1) + "%";

        // ----- RAM -----
        const ram = data.ram_usage;
        let ramPercent = 0;
        if (ram && ram.total > 0) {
            ramPercent = (ram.used / ram.total) * 100;
        }

        document.getElementById("memory_progress_bar").style.width = ramPercent + "%";
        document.getElementById("memory_percent").textContent = ramPercent.toFixed(1) + "%";

        // ----- DISK -----
        const disk = data.root_info;
        let diskPercent = 0;
        if (disk && disk.flash_total > 0) {
            diskPercent = (disk.used / disk.flash_total) * 100;
        }

        updateProgress('cpu_progress_bar', cpuPercent);
        updateProgress('memory_progress_bar', ramPercent);
        updateProgress('disk_progress_bar', diskPercent);
        document.getElementById("disk_progress_bar").style.width = diskPercent + "%";
        document.getElementById("disk_percent").textContent = diskPercent.toFixed(1) + "%";

    } catch (err) {
        console.error("Error loading system info:", err);
    }
}

function updateProgress(barId, value) {
    const bar = document.getElementById(barId);
    bar.style.backgroundColor = '#0095FF';
    bar.style.width = '0%';

    setTimeout(() => {
        bar.style.width = value + '%';

        if (value < 50)
            bar.style.backgroundColor = '#0095FF';
        else if (value < 80)
            bar.style.backgroundColor = '#FFD740';
        else
            bar.style.backgroundColor = '#FF0000';
    }, 50);
}
document.getElementById("btn_export_csv").addEventListener("click", exportSensorExcel);

async function exportSensorExcel() {
    try {
        const offset = (sensorCurrentPage - 1) * SENSOR_PAGE_SIZE;
        const query = `type=${SENSOR_TYPE}&limit=${SENSOR_PAGE_SIZE}&offset=${offset}`;
        const url = `${API_BASE_URL}/data/export?${query}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (!response.ok) {
            console.error("Export Excel error:", await response.text());
            return;
        }

        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `sensor_data_page_${sensorCurrentPage}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (e) {
        console.error("Error export excel:", e);
    }
}

function updateTime() {
    const widget = document.querySelector("#sidebar-widget .weather-widget");
    if (!widget) return;

    const timeEl = widget.querySelector(".time");
    if (!timeEl) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    timeEl.textContent = `${hh}:${mm}`;
}

// Gọi 1 lần khi load trang
loadWeather();
loadSensorTable()
updateDashboard();
loadSystemInfo();


setInterval(updateTime, 1000);
// Cập nhật mỗi 60 giây 

const socket = io("http://localhost:9096");
socket.on("connect", () => {
    console.log("Đã kết nối SocketIO với ID:", socket.id);
});

socket.on("/doan/air_quality/realtime_display", (data) => {
    console.log("Nhận tin Realtime:", data);
    updateDashboard(); 
});

socket.on("/doan/air_quality/prediction_24h", (data) => {
    console.log("Nhận tin Prediction:", data);
    loadWeather();
});

socket.on("/doan/air_quality/system_info", (data) => {
    console.log("Nhận tin System Info:", data);
    loadSystemInfo();
});

socket.on("/doan/air_quality/log", (data) => {
    console.log("Nhận tin Log mới:", data);
    
    logOffset = 0;
    logHasMore = true;

    const container = document.getElementById('log-container');
    if (container) {
        container.innerHTML = ""; 
    }
    
    loadLogs(true);
});

socket.on("/doan/air_quality/debug_sub", (data) => {
    console.log("Debug Info:", data);
});

socket.on("connect_error", (err) => {
    console.error("Lỗi kết nối Socket:", err);
});
