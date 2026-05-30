const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ПОЛЬЗОВАТЕЛИ
app.post('/api/register', async (req, res) => {
    const { name, email, password, phone, passportNumber } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, phone, passport_number) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, phone, passport_number`,
            [name, email, password, phone || null, passportNumber || null]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint === 'users_email_key') {
                res.status(400).json({ success: false, error: 'Пользователь с таким email уже существует' });
            } else if (err.constraint === 'users_passport_number_key') {
                res.status(400).json({ success: false, error: 'Пользователь с таким номером паспорта уже существует' });
            } else {
                res.status(400).json({ success: false, error: 'Такой email или номер паспорта уже зарегистрирован' });
            }
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, name, email, is_admin FROM users WHERE email = $1 AND password_hash = $2',
            [email, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.json({ success: false, error: 'Неверный email или пароль' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ФУНКЦИИ АДМИНА
app.get('/api/admin/users', async (req, res) => {
    const { userId } = req.query;
    try {
        const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (!adminCheck.rows[0]?.is_admin) {
            return res.status(403).json({ success: false, error: 'Доступ запрещён' });
        }
        const result = await pool.query('SELECT id, name, email, is_admin, created_at FROM users');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/routes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, t.number as train_number 
             FROM routes r
             JOIN trains t ON r.train_id = t.id
             ORDER BY r.departure_time`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// СОЗДАНИЕ МАРШРУТА
app.post('/api/admin/routes', async (req, res) => {
    const { userId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice } = req.body;
    
    try {
        const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (!adminCheck.rows[0]?.is_admin) {
            return res.status(403).json({ success: false, error: 'Доступ запрещён' });
        }
        
        const routeResult = await pool.query(
            `INSERT INTO routes (train_id, from_station, to_station, departure_time, arrival_time, base_price)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [trainId, fromStation, toStation, departureTime, arrivalTime, basePrice]
        );
        
        const newRouteId = routeResult.rows[0].id;
        
        // Получаем ВСЕ вагоны поезда с их типами и количеством мест
        const carriages = await pool.query(
            `SELECT type, seat_count FROM carriages WHERE train_id = $1 ORDER BY id`,
            [trainId]
        );
        
        console.log('Найдено вагонов:', carriages.rows.length);
        console.log('Вагоны:', carriages.rows);
        
        if (carriages.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'У поезда нет вагонов' });
        }
        
        // Для каждого вагона создаём места
        for (const carriage of carriages.rows) {
            console.log(`Создаю ${carriage.seat_count} мест для типа ${carriage.type}`);
            
            for (let i = 1; i <= carriage.seat_count; i++) {
                await pool.query(
                    `INSERT INTO route_seats (route_id, seat_number, carriage_type, status)
                     VALUES ($1, $2, $3, 'free')
                     ON CONFLICT (route_id, seat_number) DO NOTHING`,
                    [newRouteId, i, carriage.type]
                );
            }
        }
        
        // Проверка: сколько мест создалось
        const seatCount = await pool.query(
            'SELECT COUNT(*) FROM route_seats WHERE route_id = $1',
            [newRouteId]
        );
        console.log(`Создано мест: ${seatCount.rows[0].count}`);
        
        res.json({ success: true, routeId: newRouteId });
        
    } catch (err) {
        console.error('Ошибка создания маршрута:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/admin/routes/:routeId', async (req, res) => {
    const { routeId } = req.params;
    const { userId, trainId, fromStation, toStation, departureTime, arrivalTime, basePrice } = req.body;
    try {
        const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (!adminCheck.rows[0]?.is_admin) {
            return res.status(403).json({ success: false, error: 'Доступ запрещён' });
        }
        
        const result = await pool.query(
            `UPDATE routes 
             SET train_id = $1, from_station = $2, to_station = $3, 
                 departure_time = $4, arrival_time = $5, base_price = $6
             WHERE id = $7
             RETURNING *`,
            [trainId, fromStation, toStation, departureTime, arrivalTime, basePrice, routeId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Маршрут не найден' });
        }
        
        res.json({ success: true, route: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/admin/routes/:routeId', async (req, res) => {
    const { routeId } = req.params;
    const { userId } = req.query;
    try {
        const adminCheck = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        if (!adminCheck.rows[0]?.is_admin) {
            return res.status(403).json({ success: false, error: 'Доступ запрещён' });
        }
        
        await pool.query('DELETE FROM route_seats WHERE route_id = $1', [routeId]);
        await pool.query('DELETE FROM bookings WHERE route_id = $1', [routeId]);
        await pool.query('DELETE FROM routes WHERE id = $1', [routeId]);
        
        res.json({ success: true, message: 'Маршрут удалён' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ПОЕЗДА И МАРШРУТЫ
app.get('/api/trains', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, number, name FROM trains ORDER BY id');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/routes', async (req, res) => {
    const { from, to, date } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.*, t.number as train_number, t.name as train_name,
                (SELECT COUNT(*) FROM route_seats rs WHERE rs.route_id = r.id AND rs.status = 'free') as free_seats
             FROM routes r 
             JOIN trains t ON r.train_id = t.id 
             WHERE r.from_station = $1 
               AND r.to_station = $2 
               AND DATE(r.departure_time) = $3
             ORDER BY r.departure_time`,
            [from, to, date]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Ошибка поиска маршрутов:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// СХЕМА ВАГОНА
app.get('/api/seats/:routeId', async (req, res) => {
    const { routeId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, seat_number, carriage_type, status
             FROM route_seats
             WHERE route_id = $1
             ORDER BY seat_number`,
            [routeId]
        );
        
        const carriages = [];
        const platskartSeats = [];
        const kupeSeats = [];
        
        result.rows.forEach(seat => {
            if (seat.carriage_type === 'плацкарт') {
                platskartSeats.push({
                    seat_id: seat.id,
                    seat_number: seat.seat_number,
                    status: seat.status
                });
            } else if (seat.carriage_type === 'купе') {
                kupeSeats.push({
                    seat_id: seat.id,
                    seat_number: seat.seat_number,
                    status: seat.status
                });
            }
        });
        
        if (platskartSeats.length > 0) {
            carriages.push({
                carriage_id: 1,
                type: 'плацкарт',
                carriage_number: 1,
                seats: platskartSeats
            });
        }
        
        if (kupeSeats.length > 0) {
            carriages.push({
                carriage_id: 2,
                type: 'купе',
                carriage_number: 2,
                seats: kupeSeats
            });
        }
        
        res.json({ success: true, data: carriages });
    } catch (err) {
        console.error('Ошибка получения мест:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// УСЛУГИ
app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM services ORDER BY id');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// БРОНИРОВАНИЯ
app.post('/api/bookings', async (req, res) => {
    const { userId, routeId, seatId, totalPrice, serviceIds } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const seatCheck = await client.query(
            'SELECT status FROM route_seats WHERE id = $1',
            [seatId]
        );
        
        if (!seatCheck.rows[0] || seatCheck.rows[0].status !== 'free') {
            throw new Error('Место уже занято');
        }
        
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, route_id, seat_id, total_price, status) 
             VALUES ($1, $2, $3, $4, 'pending') 
             RETURNING *`,
            [userId, routeId, seatId, totalPrice]
        );
        
        await client.query(
            `UPDATE route_seats SET status = 'booked' WHERE id = $1`,
            [seatId]
        );
        
        if (serviceIds && serviceIds.length > 0) {
            for (const serviceId of serviceIds) {
                const serviceResult = await client.query(
                    'SELECT price FROM services WHERE id = $1',
                    [serviceId]
                );
                await client.query(
                    `INSERT INTO booking_services (booking_id, service_id, price_at_booking) 
                     VALUES ($1, $2, $3)`,
                    [bookingResult.rows[0].id, serviceId, serviceResult.rows[0].price]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json({ success: true, booking: bookingResult.rows[0] });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка бронирования:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

app.put('/api/bookings/:id/pay', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE bookings 
             SET status = 'confirmed', payment_date = NOW() 
             WHERE id = $1 AND status = 'pending'
             RETURNING *`,
            [id]
        );
        
        if (result.rows.length > 0) {
            await pool.query(
                `UPDATE route_seats SET status = 'paid' 
                 WHERE id = (SELECT seat_id FROM bookings WHERE id = $1)`,
                [id]
            );
            res.json({ success: true, booking: result.rows[0] });
        } else {
            res.json({ success: false, error: 'Бронирование не найдено или уже оплачено' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT b.*, r.from_station, r.to_station, r.departure_time, 
                    rs.seat_number, rs.carriage_type
             FROM bookings b
             JOIN routes r ON b.route_id = r.id
             JOIN route_seats rs ON b.seat_id = rs.id
             WHERE b.user_id = $1
             ORDER BY b.booking_date DESC`,
            [userId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Ошибка получения бронирований:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ПРОФИЛЬ
app.get('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, passport_number, created_at 
             FROM users WHERE id = $1`,
            [userId]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, phone, passportNumber } = req.body;
    try {
        if (passportNumber) {
            const existingUser = await pool.query(
                `SELECT id FROM users WHERE passport_number = $1 AND id != $2`,
                [passportNumber, userId]
            );
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Этот номер паспорта уже зарегистрирован другим пользователем' 
                });
            }
        }

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name),
                 phone = COALESCE($2, phone),
                 passport_number = COALESCE($3, passport_number)
             WHERE id = $4
             RETURNING id, name, email, phone, passport_number, created_at`,
            [name, phone, passportNumber, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }
        
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Ошибка обновления профиля:', err);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Обязательный эндпоинт для health check (Railway проверяет его)
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/ping', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});

// Получение порта из окружения Railway
const PORT = process.env.PORT || 3001;

// Запуск сервера
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Сервер успешно запущен на порту ${PORT}`);
    console.log(`   Слушает: 0.0.0.0:${PORT}`);
});

// Обработка SIGTERM (корректное завершение)
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
