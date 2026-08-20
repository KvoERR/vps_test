// ============================================================
// 1. НАСТРОЙКА
// ============================================================

const API_BASE = '/api';

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getApiUrl(path) {
    return `${API_BASE}${path}`;
}

function formatCurrency(value) {
    return Number(value).toFixed(2);
}

function getStatusBadge(status) {
    const map = {
        'new': '<span class="status-badge new">🟣 Новое</span>',
        'paid': '<span class="status-badge paid">✅ Оплачено</span>',
        'cancelled': '<span class="status-badge cancelled">❌ Отменено</span>',
    };
    return map[status] || status;
}

function getStatusClass(status) {
    return `status-${status}`;
}

// ============================================================
// 3. УВЕДОМЛЕНИЯ (TOAST)
// ============================================================

let toastTimeout = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;

    clearTimeout(toastTimeout);

    // Небольшая задержка для анимации появления
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============================================================
// 4. API ЗАПРОСЫ
// ============================================================

async function apiRequest(method, path, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(getApiUrl(path), options);

        // Если ответ не OK — пытаемся прочитать ошибку
        if (!response.ok) {
            let errorMessage = `Ошибка ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
            } catch (_) {
                // Если не удалось прочитать JSON
            }
            throw new Error(errorMessage);
        }

        // Если статус 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        // Если ошибка сети или CORS
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Не удалось соединиться с сервером. Проверьте, запущен ли бэкенд.');
        }
        throw error;
    }
}

// ============================================================
// 5. БИЗНЕС-ЛОГИКА (ВЫЗОВЫ API)
// ============================================================

async function loadBookings() {
    try {
        const data = await apiRequest('GET', '/bookings');
        return data || [];
    } catch (error) {
        showToast(`Ошибка загрузки: ${error.message}`, 'error');
        return [];
    }
}

async function createBooking(cost) {
    try {
        const result = await apiRequest('POST', '/bookings', { cost });
        showToast(`Бронирование #${result.id} создано! 💰 ${formatCurrency(cost)}`, 'success');
        return result;
    } catch (error) {
        showToast(`Ошибка создания: ${error.message}`, 'error');
        throw error;
    }
}

async function payBooking(id, amount) {
    try {
        const result = await apiRequest('POST', `/bookings/${id}/pay`, { amount });
        showToast(`Платёж ${formatCurrency(amount)} принят ✅`, 'success');
        return result;
    } catch (error) {
        showToast(`Ошибка платежа: ${error.message}`, 'error');
        throw error;
    }
}

async function cancelBooking(id) {
    try {
        const result = await apiRequest('POST', `/bookings/${id}/cancel`);
        showToast(`Бронирование #${id} отменено`, 'info');
        return result;
    } catch (error) {
        showToast(`Ошибка отмены: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================================
// 6. ОТРИСОВКА ИНТЕРФЕЙСА
// ============================================================

function renderBookings(bookings) {
    const container = document.getElementById('bookingsContainer');

    if (!bookings || bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <h3>Нет бронирований</h3>
                <p>Создайте первое бронирование, указав стоимость выше</p>
            </div>
        `;
        return;
    }

    let html = '<div class="bookings-list">';

    for (const booking of bookings) {
        const remaining = booking.cost - booking.paid;
        const isActive = booking.status === 'new';

        html += `
            <div class="booking-card ${getStatusClass(booking.status)}">
                <div class="booking-info">
                    <span class="booking-id">#${booking.id}</span>
                    <div class="booking-details">
                        <span class="detail-item">
                            <span class="label">💰 Стоимость</span>
                            <span class="value">${formatCurrency(booking.cost)} ₽</span>
                        </span>
                        <span class="detail-item">
                            <span class="label">💳 Оплачено</span>
                            <span class="value">${formatCurrency(booking.paid)} ₽</span>
                        </span>
                        <span class="detail-item">
                            <span class="label">📊 Остаток</span>
                            <span class="value remaining ${remaining <= 0 ? 'zero' : ''}">
                                ${remaining > 0 ? formatCurrency(remaining) : '0'} ₽
                            </span>
                        </span>
                        <span class="detail-item">
                            ${getStatusBadge(booking.status)}
                        </span>
                    </div>
                </div>
                <div class="booking-actions">
                    ${isActive ? `
                        <input type="number" class="pay-input" 
                               id="pay_${booking.id}" 
                               placeholder="Сумма" 
                               min="0.01" 
                               step="0.01"
                               value="${Math.min(remaining, 100)}" />
                        <button class="btn btn-success btn-sm" onclick="handlePay('${booking.id}')">
                            💳 Оплатить
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleCancel('${booking.id}')">
                            ✖ Отменить
                        </button>
                    ` : `
                        <span style="font-size:13px; color:#6b7280;">
                            ${booking.status === 'paid' ? '✅ Завершено' : '🚫 Действия недоступны'}
                        </span>
                    `}
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
// 7. ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

async function refreshUI() {
    const container = document.getElementById('bookingsContainer');
    container.innerHTML = '<div class="loading">Загрузка...</div>';

    const bookings = await loadBookings();
    renderBookings(bookings);
}

// Создание
async function handleCreateBooking() {
    const input = document.getElementById('costInput');
    const cost = parseFloat(input.value);

    if (!cost || cost <= 0) {
        showToast('Введите корректную стоимость (больше 0)', 'error');
        return;
    }

    const btn = document.getElementById('createBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Создание...';

    try {
        await createBooking(cost);
        input.value = '';
        await refreshUI();
    } catch (_) {
        // Ошибка уже показана в showToast
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ Создать';
    }
}

// Платёж
async function handlePay(id) {
    const input = document.getElementById(`pay_${id}`);
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
        showToast('Введите корректную сумму платежа', 'error');
        return;
    }

    // Находим кнопку в той же карточке
    const card = input.closest('.booking-card');
    const btn = card?.querySelector('.btn-success');

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ ...';
    }

    try {
        await payBooking(id, amount);
        await refreshUI();
    } catch (_) {
        // Ошибка уже показана
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '💳 Оплатить';
        }
    }
}

// Отмена
async function handleCancel(id) {
    if (!confirm(`Вы уверены, что хотите отменить бронирование #${id}?`)) {
        return;
    }

    // Находим КОНКРЕТНУЮ карточку по ID
    const input = document.getElementById(`pay_${id}`);
    const card = input?.closest('.booking-card');
    const btn = card?.querySelector('.btn-danger');

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ ...';
    }

    try {
        await cancelBooking(id);
        await refreshUI();
    } catch (_) {
        // Ошибка уже показана
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '✖ Отменить';
        }
    }
}

// ============================================================
// 8. ЗАПУСК
// ============================================================

// Обработчик для кнопки "Создать"
document.getElementById('createBtn').addEventListener('click', handleCreateBooking);

// Enter для создания
document.getElementById('costInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleCreateBooking();
    }
});

// Автозагрузка при старте
refreshUI();