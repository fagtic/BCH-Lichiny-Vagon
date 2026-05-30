const API_URL = 'https://bch-lichiny-vagon.onrender.com/api';

export const api = {
    // ========== ПОЛЬЗОВАТЕЛИ ==========
    
    // Регистрация
    async register(name, email, password) {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return res.json();
    },
    
    // Вход
    async login(email, password) {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },

    // Админские методы
    async getUsers(userId) {
        const res = await fetch(`${API_URL}/admin/users?userId=${userId}`);
        return res.json();
    },

    async createRoute(userId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice) {
        const res = await fetch(`${API_URL}/admin/routes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice })
        });
        return res.json();
    },

    async getAllRoutes() {
        const res = await fetch(`${API_URL}/admin/routes`);
        return res.json();
    },

    async updateRoute(userId, routeId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice) {
        const res = await fetch(`${API_URL}/admin/routes/${routeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice })
        });
        return res.json();
    },

    async deleteRoute(userId, routeId) {
        const res = await fetch(`${API_URL}/admin/routes/${routeId}?userId=${userId}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    async getTrains() {
        const res = await fetch(`${API_URL}/trains`);
        return res.json();
    },
        
    // ========== МАРШРУТЫ ==========
    
    // Поиск маршрутов
    async searchRoutes(from, to, date) {
        const res = await fetch(`${API_URL}/routes?from=${from}&to=${to}&date=${date}`);
        return res.json();
    },
    
    // Получить все поезда
    async getTrains() {
        const res = await fetch(`${API_URL}/trains`);
        return res.json();
    },

    // Получить количество свободных мест для маршрута
    async getFreeSeats(routeId) {
        const res = await fetch(`${API_URL}/routes/${routeId}/free-seats`);
        return res.json();
    },
    
    // ========== СХЕМА ВАГОНА ==========
    
    // Получить схему вагона (места) по ID маршрута
    async getSeatMap(routeId) {
        const res = await fetch(`${API_URL}/seats/${routeId}`);
        return res.json();
    },
    
    // ========== УСЛУГИ ==========
    
    // Получить список дополнительных услуг
    async getServices() {
        const res = await fetch(`${API_URL}/services`);
        return res.json();
    },
    
    // ========== БРОНИРОВАНИЯ ==========
    
    // Создать бронирование
    async createBooking(userId, routeId, seatId, totalPrice, serviceIds) {
        const res = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, routeId, seatId, totalPrice, serviceIds })
        });
        return res.json();
    },
    
    // Подтвердить оплату
    async confirmPayment(bookingId) {
        const res = await fetch(`${API_URL}/bookings/${bookingId}/pay`, {
            method: 'PUT'
        });
        return res.json();
    },
    
    // Получить бронирования пользователя
    async getUserBookings(userId) {
        const res = await fetch(`${API_URL}/bookings/user/${userId}`);
        return res.json();
    },

    // Обновить профиль пользователя
    async updateProfile(userId, name, phone, passportNumber) {
        try {
            const res = await fetch(`${API_URL}/profile/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, passportNumber })
            });
            const data = await res.json();
            return data;
        } catch (err) {
            return { success: false, error: 'Ошибка соединения с сервером' };
        }
    },
};
