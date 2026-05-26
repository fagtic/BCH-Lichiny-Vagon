// src/components/SearchForm.jsx
import { useState } from 'react';

function SearchForm({ onSearch }) {
    const [from, setFrom] = useState('Минск');
    const [to, setTo] = useState('Брест');
    const [date, setDate] = useState('2026-05-10');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(from, to, date);
    };

    return (
        <div className="search-card">
            <form className="search-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="text-card">Откуда</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        value={from} 
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="text-card">Куда</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        value={to} 
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="text-card">Дата</label>
                    <input 
                        type="date" 
                        className="form-input" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
                <button type="submit" className="search-btn">Найти</button>
            </form>
        </div>
    );
}

export default SearchForm;