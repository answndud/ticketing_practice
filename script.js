// Game State
let gameState = {
    attemptCount: 0,
    reactionTimes: [],
    queuePositions: [],
    bestTime: null,
    startTime: null,
    seatAppearTime: null,
    selectedSeat: null,
    targetSeat: null,
    availableSeats: [],
    history: [] // Store all attempts for chart
};

// DOM Elements
const screens = {
    waiting: document.getElementById('waitingScreen'),
    ticketing: document.getElementById('ticketingScreen'),
    result: document.getElementById('resultScreen')
};

const elements = {
    attemptCount: document.getElementById('attemptCount'),
    avgTime: document.getElementById('avgTime'),
    bestTime: document.getElementById('bestTime'),
    avgQueue: document.getElementById('avgQueue'),
    waitTimer: document.getElementById('waitTimer'),
    reserveBtn: document.getElementById('reserveBtn'),
    retryBtn: document.getElementById('retryBtn'),
    seatsGrid: document.getElementById('seatsGrid'),
    selectedSeatInfo: document.getElementById('selectedSeatInfo'),
    targetSeatNumber: document.getElementById('targetSeatNumber'),
    seatInstruction: document.getElementById('seatInstruction'),
    resultReactionTime: document.getElementById('resultReactionTime'),
    resultQueuePosition: document.getElementById('resultQueuePosition'),
    resultSeatNumber: document.getElementById('resultSeatNumber'),
    resultMessage: document.getElementById('resultMessage')
};

// Initialize
function init() {
    setupRetryButton();
    setupResetStatsButton();
    loadSavedStats();
    startPractice();
}

// Load saved statistics from localStorage
function loadSavedStats() {
    const saved = localStorage.getItem('ticketingPracticeStats');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameState.attemptCount = data.attemptCount || 0;
            gameState.reactionTimes = data.reactionTimes || [];
            gameState.queuePositions = data.queuePositions || [];
            gameState.bestTime = data.bestTime || null;
            gameState.history = data.history || [];
            updateStats();
            updateChart();
        } catch (e) {
            console.error('Failed to load saved stats:', e);
        }
    }
}

// Save statistics to localStorage
function saveStats() {
    const data = {
        attemptCount: gameState.attemptCount,
        reactionTimes: gameState.reactionTimes,
        queuePositions: gameState.queuePositions,
        bestTime: gameState.bestTime,
        history: gameState.history.slice(-20) // Keep last 20 attempts
    };
    localStorage.setItem('ticketingPracticeStats', JSON.stringify(data));
}

// Generate seats with random available ones including target seat
function generateSeats() {
    elements.seatsGrid.innerHTML = '';
    const totalSeats = 150; // 15x10 grid
    
    // Pick a random target seat
    gameState.targetSeat = Math.floor(Math.random() * totalSeats) + 1;
    elements.targetSeatNumber.textContent = `${gameState.targetSeat}번`;
    
    // Generate 8-15 random available seats (including target)
    const numAvailable = Math.floor(Math.random() * 8) + 8;
    gameState.availableSeats = [gameState.targetSeat];
    
    while (gameState.availableSeats.length < numAvailable) {
        const randomSeat = Math.floor(Math.random() * totalSeats) + 1;
        if (!gameState.availableSeats.includes(randomSeat)) {
            gameState.availableSeats.push(randomSeat);
        }
    }
    
    // Create seat elements
    for (let i = 1; i <= totalSeats; i++) {
        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.dataset.seatNumber = i;
        
        if (gameState.availableSeats.includes(i)) {
            seat.classList.add('available');
            seat.textContent = i;
            seat.addEventListener('click', () => selectSeat(i, seat));
        } else {
            seat.classList.add('taken');
            seat.textContent = 'X';
        }
        
        elements.seatsGrid.appendChild(seat);
    }
}

// Select a seat
function selectSeat(seatNumber, seatElement) {
    // Record seat selection time (this is when user first interacts)
    if (!gameState.seatAppearTime) {
        gameState.seatAppearTime = Date.now();
    }
    
    // If clicking the same seat, deselect it
    if (gameState.selectedSeat === seatNumber) {
        seatElement.classList.remove('selected', 'correct', 'wrong');
        seatElement.classList.add('available');
        gameState.selectedSeat = null;
        
        // Update UI
        elements.selectedSeatInfo.innerHTML = '<p class="no-selection">좌석을 선택해주세요</p>';
        elements.reserveBtn.disabled = true;
        elements.reserveBtn.querySelector('.btn-text').textContent = '좌석을 먼저 선택하세요';
        return;
    }
    
    // Remove previous selection
    document.querySelectorAll('.seat.selected').forEach(s => {
        s.classList.remove('selected', 'correct', 'wrong');
        if (s.classList.contains('available') || gameState.availableSeats.includes(parseInt(s.dataset.seatNumber))) {
            s.classList.add('available');
        }
    });
    
    // Mark new selection
    seatElement.classList.remove('available');
    seatElement.classList.add('selected');
    gameState.selectedSeat = seatNumber;
    
    // Check if correct seat
    const isCorrect = seatNumber === gameState.targetSeat;
    
    if (isCorrect) {
        seatElement.classList.add('correct');
        elements.selectedSeatInfo.innerHTML = `
            <div class="seat-selected-display" style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);">
                ✓ 올바른 좌석: ${seatNumber}번
            </div>
        `;
        elements.reserveBtn.disabled = false;
        elements.reserveBtn.querySelector('.btn-text').textContent = '예매하기';
        elements.seatInstruction.textContent = '✓ 올바른 좌석을 선택했습니다!';
        elements.seatInstruction.style.color = '#4caf50';
    } else {
        seatElement.classList.add('wrong');
        elements.selectedSeatInfo.innerHTML = `
            <div class="seat-selected-display" style="background: linear-gradient(135deg, #ff5252 0%, #f44336 100%);">
                ✗ 잘못된 좌석: ${seatNumber}번 (${gameState.targetSeat}번을 선택하세요!)
            </div>
        `;
        elements.reserveBtn.disabled = true;
        elements.reserveBtn.querySelector('.btn-text').textContent = `${gameState.targetSeat}번 좌석을 선택하세요`;
        elements.seatInstruction.textContent = `✗ ${gameState.targetSeat}번 좌석을 찾아서 선택하세요!`;
        elements.seatInstruction.style.color = '#ff5252';
    }
}

// Start practice session
function startPractice() {
    showScreen('waiting');
    gameState.selectedSeat = null;
    gameState.seatAppearTime = null;
    gameState.targetSeat = null;
    
    // Fixed wait time (1-3 seconds random)
    const randomDelay = Math.random() * 2000 + 1000;
    
    // Start countdown timer
    let elapsed = 0;
    const timerInterval = setInterval(() => {
        elapsed += 10;
        const seconds = Math.floor(elapsed / 1000);
        const milliseconds = elapsed % 1000;
        elements.waitTimer.textContent = 
            `${String(seconds).padStart(2, '0')}:${String(Math.floor(milliseconds / 10)).padStart(2, '0')}`;
    }, 10);
    
    // Show ticketing screen after wait time
    setTimeout(() => {
        clearInterval(timerInterval);
        showTicketingScreen();
    }, randomDelay);
}

// Show ticketing screen with seats
function showTicketingScreen() {
    showScreen('ticketing');
    gameState.startTime = Date.now();
    
    // Generate random available seats
    generateSeats();
    
    // Reset seat selection UI
    elements.selectedSeatInfo.innerHTML = '<p class="no-selection">좌석을 선택해주세요</p>';
    elements.reserveBtn.disabled = true;
    elements.reserveBtn.querySelector('.btn-text').textContent = '좌석을 먼저 선택하세요';
    elements.seatInstruction.textContent = '⚡ 지정된 좌석을 빠르게 찾아서 선택하세요!';
    elements.seatInstruction.style.color = '#f5576c';
    
    // Setup reserve button click
    elements.reserveBtn.onclick = handleReserveClick;
}

// Handle reserve button click
function handleReserveClick() {
    if (!gameState.selectedSeat || gameState.selectedSeat !== gameState.targetSeat) return;
    
    const endTime = Date.now();
    const totalReactionTime = endTime - gameState.startTime;
    
    // Calculate queue position based on reaction time
    // More realistic calculation for popular concerts
    // Very fast (< 200ms): 1-200 range
    // Fast (200-500ms): 200-700 range
    // Medium (500-1000ms): 700-1500 range
    // Slow (1000ms+): roughly 1.5:1 ratio (2722ms ≈ 4000)
    
    let queuePosition;
    if (totalReactionTime < 200) {
        // Super fast: 1 to 200
        queuePosition = Math.floor(1 + (totalReactionTime / 200) * 199);
    } else if (totalReactionTime < 500) {
        // Fast: 200 to 700
        queuePosition = Math.floor(200 + ((totalReactionTime - 200) / 300) * 500);
    } else if (totalReactionTime < 1000) {
        // Medium: 700 to 1500
        queuePosition = Math.floor(700 + ((totalReactionTime - 500) / 500) * 800);
    } else {
        // Slow: roughly 1.5:1 ratio (1000ms = 1500, 2000ms = 3000, 2722ms ≈ 4000)
        queuePosition = Math.floor(1500 + ((totalReactionTime - 1000) * 1.5));
    }
    
    // Add some randomness to make it more realistic
    const randomVariation = Math.floor(Math.random() * 100) - 50;
    queuePosition = Math.max(1, queuePosition + randomVariation);
    
    // Update statistics
    gameState.attemptCount++;
    gameState.reactionTimes.push(totalReactionTime);
    gameState.queuePositions.push(queuePosition);
    
    // Update best time
    if (gameState.bestTime === null || totalReactionTime < gameState.bestTime) {
        gameState.bestTime = totalReactionTime;
    }
    
    // Add to history
    gameState.history.push({
        attempt: gameState.attemptCount,
        reactionTime: totalReactionTime,
        queuePosition: queuePosition,
        timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    saveStats();
    updateStats();
    updateChart();
    
    showResult(totalReactionTime, queuePosition, gameState.selectedSeat);
}

// Show result screen
function showResult(reactionTime, queuePosition, seatNumber) {
    showScreen('result');
    
    elements.resultReactionTime.textContent = `${reactionTime} ms`;
    elements.resultQueuePosition.textContent = queuePosition.toLocaleString();
    elements.resultSeatNumber.textContent = `${seatNumber}번`;
    
    // Generate message based on performance
    let message = '';
    if (queuePosition < 200) {
        message = '🔥 엄청난 속도입니다! 실전에서도 성공 가능성이 매우 높아요!';
    } else if (queuePosition < 700) {
        message = '🚀 아주 빠릅니다! 이 정도면 티켓팅 성공할 수 있어요!';
    } else if (queuePosition < 1500) {
        message = '💪 빠른 편입니다! 조금만 더 연습하면 완벽해요!';
    } else if (queuePosition < 3000) {
        message = '⚡ 괜찮아요! 반복 연습으로 더 빨라질 수 있어요!';
    } else if (queuePosition < 5000) {
        message = '💡 좌석을 더 빠르게 찾는 연습이 필요해요!';
    } else {
        message = '🎯 천천히 연습하면서 감을 익혀보세요. 좌석 위치를 빠르게 파악하는 것이 중요해요!';
    }
    
    elements.resultMessage.textContent = message;
}

// Update statistics display
function updateStats() {
    elements.attemptCount.textContent = gameState.attemptCount;
    
    if (gameState.reactionTimes.length > 0) {
        const avg = gameState.reactionTimes.reduce((a, b) => a + b, 0) / gameState.reactionTimes.length;
        elements.avgTime.textContent = `${Math.round(avg)} ms`;
    }
    
    if (gameState.bestTime !== null) {
        elements.bestTime.textContent = `${gameState.bestTime} ms`;
    }
    
    if (gameState.queuePositions.length > 0) {
        const avgQueue = gameState.queuePositions.reduce((a, b) => a + b, 0) / gameState.queuePositions.length;
        elements.avgQueue.textContent = Math.round(avgQueue).toLocaleString();
    }
}

// Update performance chart
function updateChart() {
    const canvas = document.getElementById('performanceChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    if (gameState.history.length === 0) {
        // Show empty state
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('연습을 시작하면 그래프가 표시됩니다', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Get last 10 attempts
    const recentHistory = gameState.history.slice(-10);
    const dataPoints = recentHistory.length;
    
    if (dataPoints === 0) return;
    
    // Find max values for scaling
    const maxReactionTime = Math.max(...recentHistory.map(h => h.reactionTime));
    const maxQueuePosition = Math.max(...recentHistory.map(h => h.queuePosition));
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Draw reaction time line (blue)
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    recentHistory.forEach((point, index) => {
        const x = padding + (chartWidth / Math.max(1, dataPoints - 1)) * index;
        const y = padding + chartHeight - (point.reactionTime / maxReactionTime) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw reaction time points
    recentHistory.forEach((point, index) => {
        const x = padding + (chartWidth / Math.max(1, dataPoints - 1)) * index;
        const y = padding + chartHeight - (point.reactionTime / maxReactionTime) * chartHeight;
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw queue position line (pink) - inverted because lower is better
    ctx.strokeStyle = '#f093fb';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    
    recentHistory.forEach((point, index) => {
        const x = padding + (chartWidth / Math.max(1, dataPoints - 1)) * index;
        // Invert: lower queue position = higher on chart
        const normalizedQueue = 1 - (point.queuePosition / maxQueuePosition);
        const y = padding + chartHeight - (normalizedQueue * chartHeight);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw queue position points
    recentHistory.forEach((point, index) => {
        const x = padding + (chartWidth / Math.max(1, dataPoints - 1)) * index;
        const normalizedQueue = 1 - (point.queuePosition / maxQueuePosition);
        const y = padding + chartHeight - (normalizedQueue * chartHeight);
        
        ctx.fillStyle = '#f093fb';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    // Y-axis labels (reaction time)
    ctx.fillText(`${Math.round(maxReactionTime)}ms`, padding - 5, padding + 5);
    ctx.fillText('0ms', padding - 5, padding + chartHeight + 5);
    
    // X-axis labels (attempt numbers)
    ctx.textAlign = 'center';
    recentHistory.forEach((point, index) => {
        if (index % 2 === 0 || dataPoints <= 5) {
            const x = padding + (chartWidth / Math.max(1, dataPoints - 1)) * index;
            ctx.fillText(`#${point.attempt}`, x, canvas.height - 10);
        }
    });
}

// Setup retry button
function setupRetryButton() {
    elements.retryBtn.addEventListener('click', () => {
        startPractice();
    });
}

// Setup reset stats button
function setupResetStatsButton() {
    const resetBtn = document.getElementById('resetStatsBtn');
    resetBtn.addEventListener('click', () => {
        if (confirm('모든 통계를 초기화하시겠습니까?\n(시도 횟수, 평균 반응속도, 최고 기록, 그래프 등)')) {
            resetStats();
        }
    });
}

// Reset all statistics
function resetStats() {
    gameState.attemptCount = 0;
    gameState.reactionTimes = [];
    gameState.queuePositions = [];
    gameState.bestTime = null;
    gameState.history = [];
    
    // Clear localStorage
    localStorage.removeItem('ticketingPracticeStats');
    
    // Update display
    updateStats();
    updateChart();
    
    // Show confirmation
    alert('통계가 초기화되었습니다! ✨');
}

// Show specific screen
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Keyboard support (Space or Enter to click reserve button)
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !elements.reserveBtn.disabled) {
        e.preventDefault();
        handleReserveClick();
    }
});

// Redraw chart on window resize
window.addEventListener('resize', () => {
    if (gameState.history.length > 0) {
        updateChart();
    }
});

// Start the application
init();
