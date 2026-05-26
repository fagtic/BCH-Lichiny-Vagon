// src/components/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';

function ProfilePage({ user, isLoggedIn, myBookings, onUpdateUser, onShowLogin }) {
    const [isEditing, setIsEditing] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profilePassport, setProfilePassport] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileName(user.name || '');
            setProfilePhone(user.phone || '');
            setProfilePassport(user.passport_number || '');
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await api.updateProfile(user.id, profileName, profilePhone, profilePassport);
        if (result.success) {
            onUpdateUser(result.user);
            setIsEditing(false);
            alert('Данные профиля сохранены!');
        } else {
            alert('Ошибка: ' + result.error);
        }
        setIsSaving(false);
    };

    const handleCancel = () => {
        setProfileName(user?.name || '');
        setProfilePhone(user?.phone || '');
        setProfilePassport(user?.passport_number || '');
        setIsEditing(false);
    };

    if (!isLoggedIn) {
        return (
            <div className="results-section">
                <h2 className="results-title">Личные данные</h2>
                <div className="profile-not-logged">
                    <p style={{ textAlign: 'center', padding: '40px', color: '#ccc' }}>
                        👤 Войдите в систему, чтобы просматривать и редактировать профиль
                    </p>
                    <button onClick={onShowLogin} className="search-btn" style={{ display: 'block', margin: '0 auto' }}>
                        Войти или зарегистрироваться
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="results-section">
            <h2 className="results-title">Личные данные</h2>
            <div className="profile-container">
                {!isEditing ? (
                    <div className="profile-info">
                        <div className="profile-avatar">
                            <div className="avatar">👤</div>
                        </div>
                        <div className="profile-details">
                            <div className="profile-row">
                                <span className="profile-label">Имя:</span>
                                <span className="profile-value">{profileName}</span>
                            </div>
                            <div className="profile-row">
                                <span className="profile-label">Email:</span>
                                <span className="profile-value">{user?.email}</span>
                            </div>
                            <div className="profile-row">
                                <span className="profile-label">Телефон:</span>
                                <span className="profile-value">{profilePhone || 'Не указан'}</span>
                            </div>
                            <div className="profile-row">
                                <span className="profile-label">Номер паспорта:</span>
                                <span className="profile-value">{profilePassport || 'Не указан'}</span>
                            </div>
                            <div className="profile-row">
                                <span className="profile-label">Дата регистрации:</span>
                                <span className="profile-value">{new Date(user?.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button onClick={() => setIsEditing(true)} className="edit-profile-btn">
                            ✏️ Редактировать
                        </button>
                    </div>
                ) : (
                    <div className="profile-edit">
                        <h3 style={{ color: '#129706', marginBottom: '20px' }}>Редактирование профиля</h3>
                        <div className="form-group">
                            <label className="text-card">Имя</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={profileName} 
                                onChange={(e) => setProfileName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-card">Телефон</label>
                            <input 
                                type="tel" 
                                className="form-input" 
                                value={profilePhone} 
                                onChange={(e) => setProfilePhone(e.target.value)}
                                placeholder="+375 (29) 123-45-67"
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-card">Номер паспорта</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={profilePassport} 
                                onChange={(e) => setProfilePassport(e.target.value)}
                                placeholder="MP1234567"
                            />
                        </div>
                        <div className="profile-buttons">
                            <button onClick={handleSave} className="save-profile-btn" disabled={isSaving}>
                                {isSaving ? 'Сохранение...' : '💾 Сохранить'}
                            </button>
                            <button onClick={handleCancel} className="cancel-profile-btn">
                                ❌ Отмена
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="profile-stats">
                    <h3 style={{ color: '#129706', marginBottom: '15px' }}>Статистика</h3>
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-number">{myBookings.length}</div>
                            <div className="stat-label">Поездок</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{myBookings.filter(b => b.status === 'confirmed').length}</div>
                            <div className="stat-label">Оплачено</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{myBookings.filter(b => b.status === 'pending').length}</div>
                            <div className="stat-label">Ожидают оплаты</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;