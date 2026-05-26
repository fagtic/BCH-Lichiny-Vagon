import { useState, useEffect } from 'react'
import logoImg from './assets/logo.png'
import './App.css'
import { api } from './api'
import ProfilePage from './components/ProfilePage'
import SearchForm from './components/SearchForm'

function App() {
  // Состояния для навигации
  const [currentPage, setCurrentPage] = useState('tickets')
  
  // Состояния для поиска
  const [showResults, setShowResults] = useState(false)
  const [trains, setTrains] = useState([])
  
  // Состояния для схемы вагона
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [showSeatMap, setShowSeatMap] = useState(false)
  const [seatMap, setSeatMap] = useState(null)
  const [selectedSeat, setSelectedSeat] = useState(null)
  
  // Состояния для бронирования
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingExtras, setBookingExtras] = useState({ linen: false, meal: false })
  const [bookingResult, setBookingResult] = useState(null)
  const [services, setServices] = useState([])
  
  // Состояния для моих поездок
  const [myBookings, setMyBookings] = useState([])
  
  // Состояния для авторизации
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPassport, setRegisterPassport] = useState('')
  const [authError, setAuthError] = useState('')

  // Заголовки для разных страниц
  const pageTitles = {
    tickets: { title: 'Поезда «Личный Вагон»', subtitle: 'Выберите свой маршрут' },
    myTrips: { title: 'Мои поездки', subtitle: 'История ваших путешествий' },
    profile: { title: 'Профиль', subtitle: 'Управление личными данными' },
    help: { title: 'Помощь', subtitle: 'Ответы на вопросы и контакты' },
    admin: { title: 'Панель администратора', subtitle: 'Управление системой' }
  }

  useEffect(() => {
    const loadServices = async () => {
      const result = await api.getServices()
      if (result.success) {
        setServices(result.data)
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsLoggedIn(true)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && user) {
      loadUserBookings()
    }
  }, [isLoggedIn, user])

  const loadUserBookings = async () => {
    const result = await api.getUserBookings(user.id)
    if (result.success) {
      setMyBookings(result.data)
    }
  }

  const handleSearch = async (from, to, date) => {
    const result = await api.searchRoutes(from, to, date)
    if (result.success) {
      setTrains(result.data)
      setShowResults(true)
      setSelectedRoute(null)
      setShowSeatMap(false)
      setShowBookingForm(false)
    } else {
      alert(result.error || 'Ошибка поиска')
    }
  }

  const handleViewSeats = async (route) => {
    setSelectedRoute(route)
    const result = await api.getSeatMap(route.id)
    if (result.success) {
      const formattedSeatMap = result.data.map(carriage => ({
        carriageType: carriage.type,
        seats: carriage.seats.map(seat => ({
          number: seat.seat_number,
          status: seat.status,
          statusText: seat.status === 'free' ? 'Свободно' : 
                      seat.status === 'booked' ? 'Забронировано' :
                      seat.status === 'paid' ? 'Оплачено' : 'Недоступно',
          color: seat.status === 'free' ? '#2ecc71' :
                 seat.status === 'booked' ? '#f39c12' :
                 seat.status === 'paid' ? '#e74c3c' : '#95a5a6',
          id: seat.seat_id,
          carriageId: carriage.carriage_id
        }))
      }))
      setSeatMap(formattedSeatMap)
      setShowSeatMap(true)
      setShowBookingForm(false)
      setSelectedSeat(null)
    } else {
      alert(result.error)
    }
  }

  const handleSelectSeat = (carriageIndex, seat) => {
    if (seat.status !== 'free') {
      alert(`Это место ${seat.statusText.toLowerCase()}. Выберите другое место.`)
      return
    }
    if (!isLoggedIn) {
      alert('Пожалуйста, войдите в систему для бронирования билетов')
      setShowLoginForm(true)
      return
    }
    console.log('Выбранное место seat.id:', seat.id, 'seat.number:', seat.number);
    setSelectedSeat({
      carriageIndex,
      seatNumber: seat.number,
      seatId: seat.id,
      status: seat.status
    })
    setShowBookingForm(true)
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    if (!selectedSeat || !selectedRoute) {
      alert('Ошибка: не выбран маршрут или место')
      return
    }
    const selectedServiceIds = []
    if (bookingExtras.linen) {
      const linenService = services.find(s => s.name === 'белье')
      if (linenService) selectedServiceIds.push(linenService.id)
    }
    if (bookingExtras.meal) {
      const mealService = services.find(s => s.name === 'питание')
      if (mealService) selectedServiceIds.push(mealService.id)
    }
    let totalPrice = parseFloat(selectedRoute.base_price)
    if (bookingExtras.linen) totalPrice += 5.00
    if (bookingExtras.meal) totalPrice += 8.00
    const result = await api.createBooking(
      user.id,
      selectedRoute.id,
      selectedSeat.seatId,
      totalPrice,
      selectedServiceIds
    )
    if (result.success) {
      setBookingResult({ bookingId: result.booking.id, totalPrice: totalPrice })
      alert(`Бронирование успешно создано!\nНомер брони: ${result.booking.id}\nСумма: ${totalPrice} BYN`)
      const updatedSeatMap = await api.getSeatMap(selectedRoute.id)
      if (updatedSeatMap.success) {
        const formattedSeatMap = updatedSeatMap.data.map(carriage => ({
          carriageType: carriage.type,
          seats: carriage.seats.map(seat => ({
            number: seat.seat_number,
            status: seat.status,
            statusText: seat.status === 'free' ? 'Свободно' : 
                        seat.status === 'booked' ? 'Забронировано' :
                        seat.status === 'paid' ? 'Оплачено' : 'Недоступно',
            color: seat.status === 'free' ? '#2ecc71' :
                   seat.status === 'booked' ? '#f39c12' :
                   seat.status === 'paid' ? '#e74c3c' : '#95a5a6',
            id: seat.seat_id,
            carriageId: carriage.carriage_id
          }))
        }))
        setSeatMap(formattedSeatMap)
      }
      loadUserBookings()
    } else {
      alert(`Ошибка: ${result.error}`)
    }
  }

  const handleConfirmPayment = async (bookingId) => {
    const result = await api.confirmPayment(bookingId)
    if (result.success) {
      alert('Билет успешно оплачен! Счастливого пути!')
      setShowBookingForm(false)
      setBookingResult(null)
      setSelectedSeat(null)
      if (selectedRoute) {
        const updatedSeatMap = await api.getSeatMap(selectedRoute.id)
        if (updatedSeatMap.success) {
          const formattedSeatMap = updatedSeatMap.data.map(carriage => ({
            carriageType: carriage.type,
            seats: carriage.seats.map(seat => ({
              number: seat.seat_number,
              status: seat.status,
              statusText: seat.status === 'free' ? 'Свободно' : 
                          seat.status === 'booked' ? 'Забронировано' :
                          seat.status === 'paid' ? 'Оплачено' : 'Недоступно',
              color: seat.status === 'free' ? '#2ecc71' :
                     seat.status === 'booked' ? '#f39c12' :
                     seat.status === 'paid' ? '#e74c3c' : '#95a5a6',
              id: seat.seat_id,
              carriageId: carriage.carriage_id
            }))
          }))
          setSeatMap(formattedSeatMap)
        }
      }
      loadUserBookings()
    } else {
      alert(`Ошибка оплаты: ${result.error}`)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const result = await api.login(loginEmail, loginPassword)
    if (result.success) {
      setIsLoggedIn(true)
      setUser(result.user)
      localStorage.setItem('user', JSON.stringify(result.user))
      setShowLoginForm(false)
      setAuthError('')
      setLoginEmail('')
      setLoginPassword('')
      alert(`Добро пожаловать, ${result.user.name}!`)
    } else {
      setAuthError(result.error)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const result = await api.register(registerName, registerEmail, registerPassword, '', registerPassport)
    if (result.success) {
      alert('Регистрация успешна! Теперь войдите в систему.')
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')
      setRegisterPassport('')
      setLoginEmail(registerEmail)
      setAuthError('')
    } else {
      setAuthError(result.error)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('user')
    setShowSeatMap(false)
    setShowBookingForm(false)
    setCurrentPage('tickets')
    alert('Вы вышли из системы')
  }

  const calculateTotalPrice = () => {
    let total = selectedRoute?.base_price ? parseFloat(selectedRoute.base_price) : 0
    if (bookingExtras.linen) total += 5.00
    if (bookingExtras.meal) total += 8.00
    return total.toFixed(2)
  }

  // Страница админа
  const AdminPage = () => {
      const [users, setUsers] = useState([]);
      const [trains, setTrains] = useState([]);
      const [routes, setRoutes] = useState([]);
      const [newRoute, setNewRoute] = useState({
          trainId: '',
          fromStation: '',
          toStation: '',
          departureTime: '',
          arrivalTime: '',
          basePrice: ''
      });
      const [editingRoute, setEditingRoute] = useState(null);
      const [message, setMessage] = useState('');

      useEffect(() => {
          loadUsers();
          loadTrains();
          loadRoutes();
      }, []);

      const loadUsers = async () => {
          const result = await api.getUsers(user.id);
          if (result.success) setUsers(result.data);
      };

      const loadTrains = async () => {
          const result = await api.getTrains();
          if (result.success) setTrains(result.data);
      };

      const loadRoutes = async () => {
          const result = await api.getAllRoutes();
          if (result.success) setRoutes(result.data);
      };

      const handleCreateRoute = async (e) => {
          e.preventDefault();
          const result = await api.createRoute(
              user.id,
              newRoute.trainId,
              newRoute.fromStation,
              newRoute.toStation,
              newRoute.departureTime,
              newRoute.arrivalTime,
              newRoute.basePrice
          );
          if (result.success) {
              setMessage('✅ Маршрут создан!');
              setNewRoute({ trainId: '', fromStation: '', toStation: '', departureTime: '', arrivalTime: '', basePrice: '' });
              loadRoutes();
          } else {
              setMessage('❌ Ошибка: ' + result.error);
          }
      };

      const handleDeleteRoute = async (routeId) => {
          if (confirm('🗑️ Удалить этот маршрут?')) {
              const result = await api.deleteRoute(user.id, routeId);
              if (result.success) {
                  setMessage('✅ Маршрут удалён');
                  loadRoutes();
              } else {
                  setMessage('❌ Ошибка: ' + result.error);
              }
          }
      };

      const handleEditRoute = (route) => {
          setEditingRoute({
              id: route.id,
              fromStation: route.from_station,
              toStation: route.to_station,
              departureTime: route.departure_time.slice(0, 16),
              arrivalTime: route.arrival_time.slice(0, 16),
              basePrice: route.base_price,
              trainId: route.train_id
          });
      };

      const handleUpdateRoute = async (e) => {
          e.preventDefault();
          const result = await api.updateRoute(
              user.id,
              editingRoute.id,
              editingRoute.trainId,
              editingRoute.fromStation,
              editingRoute.toStation,
              editingRoute.departureTime,
              editingRoute.arrivalTime,
              editingRoute.basePrice
          );
          if (result.success) {
              setMessage('✅ Маршрут обновлён!');
              setEditingRoute(null);
              loadRoutes();
          } else {
              setMessage('❌ Ошибка: ' + result.error);
          }
      };

      const cancelEdit = () => {
          setEditingRoute(null);
      };

      if (!user?.is_admin) {
          return (
              <div className="results-section">
                  <p style={{ padding: 40, textAlign: 'center', color: '#e74c3c' }}>
                      ⛔ Доступ запрещён. Только для администратора.
                  </p>
              </div>
          );
      }

      return (
          <div className="results-section">
              <h2 className="results-title">👑 Панель администратора</h2>
              {message && <p style={{ color: '#2ecc71', marginBottom: 20 }}>{message}</p>}
              
              {/* Создание маршрута */}
              <div style={{ marginBottom: 40 }}>
                  <h3 style={{ color: '#129706', marginBottom: 15 }}>➕ Создать маршрут</h3>
                  <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <select 
                          className="form-input" 
                          value={newRoute.trainId} 
                          onChange={(e) => setNewRoute({...newRoute, trainId: e.target.value})} 
                          required
                      >
                          <option value="">Выберите поезд</option>
                          {trains.map(t => (
                              <option key={t.id} value={t.id}>{t.number} - {t.name}</option>
                          ))}
                      </select>
                      <div style={{ display: 'flex', gap: 10 }}>
                          <input 
                              className="form-input" 
                              placeholder="Откуда" 
                              value={newRoute.fromStation} 
                              onChange={(e) => setNewRoute({...newRoute, fromStation: e.target.value})} 
                              required 
                          />
                          <input 
                              className="form-input" 
                              placeholder="Куда" 
                              value={newRoute.toStation} 
                              onChange={(e) => setNewRoute({...newRoute, toStation: e.target.value})} 
                              required 
                          />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                          <input 
                              type="datetime-local" 
                              className="form-input" 
                              value={newRoute.departureTime} 
                              onChange={(e) => setNewRoute({...newRoute, departureTime: e.target.value})} 
                              required 
                          />
                          <input 
                              type="datetime-local" 
                              className="form-input" 
                              value={newRoute.arrivalTime} 
                              onChange={(e) => setNewRoute({...newRoute, arrivalTime: e.target.value})} 
                              required 
                          />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                          <input 
                              className="form-input" 
                              type="number" 
                              step="0.01" 
                              placeholder="Цена (BYN)" 
                              value={newRoute.basePrice} 
                              onChange={(e) => setNewRoute({...newRoute, basePrice: e.target.value})} 
                              required 
                          />
                          <button type="submit" className="search-btn">➕ Создать</button>
                      </div>
                  </form>
              </div>

              {/* Редактирование маршрута (модальное окно) */}
              {editingRoute && (
                  <div className="modal">
                      <div className="modal-content" style={{ width: '500px' }}>
                          <span className="close" onClick={cancelEdit}>&times;</span>
                          <h3>✏️ Редактировать маршрут</h3>
                          <form onSubmit={handleUpdateRoute} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <select 
                                  className="form-input" 
                                  value={editingRoute.trainId} 
                                  onChange={(e) => setEditingRoute({...editingRoute, trainId: e.target.value})} 
                                  required
                              >
                                  <option value="">Выберите поезд</option>
                                  {trains.map(t => (
                                      <option key={t.id} value={t.id}>{t.number} - {t.name}</option>
                                  ))}
                              </select>
                              <div style={{ display: 'flex', gap: 10 }}>
                                  <input 
                                      className="form-input" 
                                      placeholder="Откуда" 
                                      value={editingRoute.fromStation} 
                                      onChange={(e) => setEditingRoute({...editingRoute, fromStation: e.target.value})} 
                                      required 
                                  />
                                  <input 
                                      className="form-input" 
                                      placeholder="Куда" 
                                      value={editingRoute.toStation} 
                                      onChange={(e) => setEditingRoute({...editingRoute, toStation: e.target.value})} 
                                      required 
                                  />
                              </div>
                              <div style={{ display: 'flex', gap: 10 }}>
                                  <input 
                                      type="datetime-local" 
                                      className="form-input" 
                                      value={editingRoute.departureTime} 
                                      onChange={(e) => setEditingRoute({...editingRoute, departureTime: e.target.value})} 
                                      required 
                                  />
                                  <input 
                                      type="datetime-local" 
                                      className="form-input" 
                                      value={editingRoute.arrivalTime} 
                                      onChange={(e) => setEditingRoute({...editingRoute, arrivalTime: e.target.value})} 
                                      required 
                                  />
                              </div>
                              <div style={{ display: 'flex', gap: 10 }}>
                                  <input 
                                      className="form-input" 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="Цена (BYN)" 
                                      value={editingRoute.basePrice} 
                                      onChange={(e) => setEditingRoute({...editingRoute, basePrice: e.target.value})} 
                                      required 
                                  />
                                  <button type="submit" className="search-btn">💾 Сохранить</button>
                                  <button type="button" onClick={cancelEdit} className="buy-btn" style={{ background: '#555' }}>Отмена</button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}

              {/* Удаление и редактирование маршрута */}
              <div style={{ marginBottom: 40 }}>
                  <h3 style={{ color: '#129706', marginBottom: 15 }}>✏️ Управление маршрутами</h3>
                  {routes.length === 0 ? (
                      <p style={{ color: '#888' }}>Нет маршрутов</p>
                  ) : (
                      <div className="trains-list">
                          {routes.map(route => (
                              <div key={route.id} className="train-card" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                      <div style={{ fontWeight: 'bold' }}>
                                          {route.from_station} → {route.to_station}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#888' }}>
                                          Поезд: {route.train_number} | 
                                          Отправление: {new Date(route.departure_time).toLocaleString()} | 
                                          Цена: <strong style={{ color: '#129706' }}>{route.base_price} BYN</strong>
                                      </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 10 }}>
                                      <button 
                                          onClick={() => handleEditRoute(route)} 
                                          className="buy-btn" 
                                          style={{ background: '#f39c12' }}
                                      >
                                          ✏️ Редактировать
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteRoute(route.id)} 
                                          className="buy-btn" 
                                          style={{ background: '#e74c3c' }}
                                      >
                                          🗑️ Удалить
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Список пользователей */}
              <div>
                  <h3 style={{ color: '#129706', marginBottom: 15 }}>👥 Пользователи</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                          <tr style={{ borderBottom: '2px solid #3a3a4a', textAlign: 'left' }}>
                              <th style={{ padding: '8px', color: '#d7d0d0'}}>ID</th>
                              <th style={{ padding: '8px', color: '#d7d0d0' }}>Имя</th>
                              <th style={{ padding: '8px', color: '#d7d0d0' }}>Email</th>
                              <th style={{ padding: '8px', color: '#d7d0d0' }}>Админ</th>
                          </tr>
                      </thead>
                      <tbody>
                          {users.map(u => (
                              <tr key={u.id} style={{ borderBottom: '1px solid #545461', textAlign: 'left'}}>
                                  <td style={{ padding: '8px', color: '#d7d0d0' }}>{u.id}</td>
                                  <td style={{ padding: '8px', color: '#d7d0d0' }}>{u.name}</td>
                                  <td style={{ padding: '8px', color: '#d7d0d0' }}>{u.email}</td>
                                  <td style={{ padding: '8px', color: '#d7d0d0' }}>{u.is_admin ? '✅' : '❌'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const MyTripsPage = () => (
    <div className="results-section">
      <h2 className="results-title">Мои поездки</h2>
      {!isLoggedIn ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>👤 Войдите в систему, чтобы увидеть свои поездки</p>
      ) : myBookings.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>🎫 У вас пока нет забронированных билетов</p>
      ) : (
        <div className="trains-list">
          {myBookings.map(booking => (
            <div key={booking.id} className="train-card">
              <div className="info-card">
                <div className="train-number">Билет №{booking.id}</div>
                <div className="train-route">{booking.from_station} → {booking.to_station}</div>
                <div className="train-time">Отправление: {new Date(booking.departure_time).toLocaleString()}</div>
                <div className="train-time">Место: №{booking.seat_number} ({booking.carriage_type})</div>
                <div className="train-time">Статус: {booking.status === 'pending' ? '⏳ Ожидает оплаты' : booking.status === 'confirmed' ? '✅ Оплачен' : booking.status === 'cancelled' ? '❌ Отменён' : booking.status}</div>
              </div>
              <div className="train-details">
                <div className="train-price">{booking.total_price} <span>BYN</span></div>
                {booking.status === 'pending' && (
                  <button className="buy-btn" onClick={() => alert(`Оплата билета №${booking.id}\nСумма: ${booking.total_price} BYN`)}>Оплатить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const HelpPage = () => (
    <div className="results-section">
      <h2 className="results-title">Помощь</h2>
      <div className="help-content" style={{ padding: '20px', color: '#ccc' }}>
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#129706', marginBottom: '10px' }}>📞 Контакты</h3>
          <p>Телефон горячей линии: <strong style={{ color: 'white' }}>105</strong></p>
          <p>Справочная служба БЧ: <strong style={{ color: 'white' }}>+375 (17) 225-25-25</strong></p>
          <p>Email: <strong style={{ color: 'white' }}>support@bch.by</strong></p>
        </div>
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#129706', marginBottom: '10px' }}>❓ Часто задаваемые вопросы</h3>
          <div style={{ marginBottom: '15px' }}>
            <p><strong style={{ color: '#129706' }}>Как купить билет?</strong></p>
            <p>1. Выберите маршрут и дату поездки<br/>2. Нажмите "Выбрать места"<br/>3. Выберите свободное место на схеме вагона<br/>4. Оформите бронирование и оплатите билет</p>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p><strong style={{ color: '#129706' }}>Как долго действует бронь?</strong></p>
            <p>Бронирование действует 15 минут. Затем места снова становятся доступны для покупки.</p>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p><strong style={{ color: '#129706' }}>Какие способы оплаты доступны?</strong></p>
            <p>Банковские карты Visa, MasterCard, Белкарт, а также ЕРИП.</p>
          </div>
        </div>
        <div>
          <h3 style={{ color: '#129706', marginBottom: '10px' }}>🚉 Условия пассажирских перевозок</h3>
          <p>Пассажир обязан иметь при себе проездной документ (билет) и документ, удостоверяющий личность.</p>
          <p>Провоз багажа оплачивается отдельно согласно тарифам.</p>
          <p>Дети до 5 лет едут бесплатно без предоставления отдельного места.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <img src={logoImg} alt="Логотип БЧ" className="logo-img" />
          <span className="logo-text">БЧ <span className="highlight">Личный Вагон</span></span>
        </div>
        <nav className="nav">
          <button onClick={() => { setCurrentPage('tickets'); setShowResults(false); setShowSeatMap(false); }} className="nav-link">Билеты</button>
          {isLoggedIn && (
            <button onClick={() => { setCurrentPage('myTrips'); setShowResults(false); setShowSeatMap(false); }} className="nav-link">Мои поездки</button>
          )}
          <button onClick={() => setCurrentPage('help')} className="nav-link">Помощь</button>
          {isLoggedIn ? (
            <>
              <button onClick={() => setCurrentPage('profile')} className="nav-link user-name">
                👤 {user?.name?.split(' ')[0]}
              </button>
              <button onClick={handleLogout} className="nav-link logout-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Выйти</button>
            </>
          ) : (
            <button onClick={() => setShowLoginForm(true)} className="nav-link login-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Войти</button>
          )}
          {isLoggedIn && user?.is_admin && (
          <button onClick={() => setCurrentPage('admin')} className="nav-link">👑 Админ</button>
          )}
        </nav>
      </header>

      {showLoginForm && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => { setShowLoginForm(false); setAuthError(''); }}>&times;</span>
            <h3>Вход в систему</h3>
            {authError && <p className="error">{authError}</p>}
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              <input type="password" placeholder="Пароль" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="submit">Войти</button>
            </form>
            <hr />
            <h4>Регистрация</h4>
            <form onSubmit={handleRegister}>
              <input type="text" placeholder="Имя" value={registerName} onChange={(e) => setRegisterName(e.target.value)} required />
              <input type="email" placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} required />
              <input type="password" placeholder="Пароль (мин. 6 символов)" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required />
              <input type="text" placeholder="Номер паспорта (необязательно)" value={registerPassport} onChange={(e) => setRegisterPassport(e.target.value)} />
              <button type="submit">Зарегистрироваться</button>
            </form>
          </div>
        </div>
      )}

      <section className="hero">
        <h1 className="hero-title">{pageTitles[currentPage].title}</h1>
        <p className="hero-subtitle">{pageTitles[currentPage].subtitle}</p>
      </section>

      {currentPage === 'tickets' && (
        <>
          <SearchForm onSearch={handleSearch} />
          
          {showResults && (
            <div className="results-section">
              <h2 className="results-title">Доступные поезда</h2>
              <div className="trains-list">
                {trains.length > 0 ? (
                  trains.map(train => (
                    <div key={train.id} className="train-card">
                      <div className="info-card">
                        <div className="train-number">Поезд №{train.train_number}</div>
                        <div className="train-route">{train.from_station} → {train.to_station}</div>
                        <div className="train-time">
                          Отправление: {new Date(train.departure_time).toLocaleTimeString()} • 
                          Прибытие: {new Date(train.arrival_time).toLocaleTimeString()} • 
                          В пути: {Math.round((new Date(train.arrival_time) - new Date(train.departure_time)) / 1000 / 60)} мин
                        </div>
                        <div className="train-time">Свободных мест: {train.free_seats !== undefined ? train.free_seats : '--'}</div>
                      </div>
                      <div className="train-details">
                        <div className="train-price">{train.base_price} <span>BYN</span></div>
                        <button className="buy-btn" onClick={() => handleViewSeats(train)}>Выбрать места</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', padding: '20px' }}>Поездов не найдено. Измените параметры поиска.</p>
                )}
              </div>
            </div>
          )}

          {showSeatMap && seatMap && (
            <div className="seat-map-section">
              <h2 className="results-title">Схема вагона — {selectedRoute?.train_number}</h2>
              {seatMap.map((carriage, idx) => (
                <div key={idx} className="carriage-container">
                  <h3>Вагон: {carriage.carriageType === 'плацкарт' ? 'Плацкарт' : 'Купе'}</h3>
                  <div className="seats-grid">
                    {carriage.seats.map((seat, seatIdx) => (
                      <button
                        key={seatIdx}
                        className={`seat-btn ${seat.status}`}
                        style={{ backgroundColor: seat.color }}
                        onClick={() => handleSelectSeat(idx, seat)}
                        disabled={seat.status !== 'free'}
                        title={`Место ${seat.number} - ${seat.statusText}`}
                      >
                        {seat.number}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="legend">
                <span><span className="legend-free"></span> Свободно</span>
                <span><span className="legend-booked"></span> Забронировано</span>
                <span><span className="legend-paid"></span> Оплачено</span>
                <span><span className="legend-unavailable"></span> Недоступно</span>
              </div>
            </div>
          )}

          {showBookingForm && selectedSeat && (
            <div className="modal">
              <div className="modal-content booking-modal">
                <span className="close" onClick={() => { setShowBookingForm(false); setSelectedSeat(null); setBookingResult(null); }}>&times;</span>
                <h3>Оформление билета</h3>
                <div className="booking-info">
                  <p><strong>Маршрут:</strong> {selectedRoute?.from_station} → {selectedRoute?.to_station}</p>
                  <p><strong>Поезд:</strong> №{selectedRoute?.train_number}</p>
                  <p><strong>Место:</strong> №{selectedSeat.seatNumber}</p>
                  <p><strong>Базовая стоимость:</strong> {selectedRoute?.base_price} BYN</p>
                </div>
                <div className="extras">
                  <h4>Дополнительные услуги</h4>
                  <label>
                    <input type="checkbox" checked={bookingExtras.linen} onChange={(e) => setBookingExtras({...bookingExtras, linen: e.target.checked})}/>
                    Комплект белья (+5.00 BYN)
                  </label>
                  <label>
                    <input type="checkbox" checked={bookingExtras.meal} onChange={(e) => setBookingExtras({...bookingExtras, meal: e.target.checked})}/>
                    Питание (+8.00 BYN)
                  </label>
                </div>
                <div className="total-price">
                  <strong>Итого к оплате: {calculateTotalPrice()} BYN</strong>
                </div>
                {!bookingResult ? (
                  <button onClick={handleCreateBooking} className="booking-btn">Забронировать</button>
                ) : (
                  <div className="payment-section">
                    <p className="success-msg">Бронирование создано!</p>
                    <p>Номер брони: {bookingResult.bookingId}</p>
                    <p>Сумма: {bookingResult.totalPrice} BYN</p>
                    <button onClick={() => handleConfirmPayment(bookingResult.bookingId)} className="payment-btn">
                      Подтвердить оплату
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {currentPage === 'myTrips' && <MyTripsPage />}
      {currentPage === 'profile' && (
        <ProfilePage 
          user={user}
          isLoggedIn={isLoggedIn}
          myBookings={myBookings}
          onUpdateUser={(updatedUser) => {
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
          }}
          onShowLogin={() => setShowLoginForm(true)}
        />
      )}
      {currentPage === 'help' && <HelpPage />}
      {currentPage === 'admin' && <AdminPage />}

      <footer className="footer">
        <p>© 2026 БЧ «Личный Вагон»</p>
      </footer>
    </div>
  )
}

export default App