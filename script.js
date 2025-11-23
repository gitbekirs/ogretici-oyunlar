const app = {
    currentLevel: 1,
    totalQuestions: 10,
    correctCount: 0,
    score: 0,
    timer: 0,
    timerInterval: null,
    audioCtx: null,
    isMuted: false,
    bgMusic: null,
    draggedItemColor: '',

    // Renk Paleti (1-9)
    levelColors: [
        '#FFB900', // 0
        '#00A4EF', // 1: Mavi
        '#FF8C00', // 2: Turuncu
        '#7FBA00', // 3: Yeşil
        '#F25022', // 4: Kırmızı
        '#9B30FF', // 5: Mor
        '#00CED1', // 6: Turkuaz
        '#FF1493', // 7: Pembe
        '#8B4513', // 8: Kahve
        '#4B0082'  // 9: İndigo
    ],

    init: function () {
        this.renderLevelSelect();
        this.registerSW();
        this.updateUIForScene('scene-intro'); // Initial UI

        // Audio Context Init
        document.addEventListener('click', () => {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });

        // Modal Backdrop Close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeAllModals();
            });
        });

        // Init Mute Button
        const muteBtn = document.getElementById('mute-btn');
        this.bgMusic = document.getElementById('bg-music');
        if (this.bgMusic) this.bgMusic.volume = 0.2;

        const savedMute = localStorage.getItem('isMuted');
        if (savedMute === 'true') {
            this.isMuted = true;
            if (this.bgMusic) this.bgMusic.muted = true;
        }

        if (muteBtn) {
            if (this.isMuted) {
                muteBtn.innerHTML = Icons.get('volume-xmark') + ' Sesi Aç';
            } else {
                muteBtn.innerHTML = Icons.get('volume-high') + ' Sesi Kapat';
            }
        }
    },

    registerSW: function () {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('Service Worker Registered'))
                .catch((err) => console.log('SW Fail:', err));
        }
    },

    // --- NAVIGATION & UI LOGIC ---

    showScene: function (sceneId) {
        // Fade Out Active Scene
        const activeScene = document.querySelector('.scene.active');
        if (activeScene) {
            activeScene.style.opacity = '0';
            setTimeout(() => {
                activeScene.classList.remove('active');
                // Fade In New Scene
                const nextScene = document.getElementById(sceneId);
                nextScene.classList.add('active');
                void nextScene.offsetWidth; // Reflow
                nextScene.style.opacity = '1';
            }, 300);
        } else {
            const nextScene = document.getElementById(sceneId);
            nextScene.classList.add('active');
            setTimeout(() => nextScene.style.opacity = '1', 50);
        }

        // Update Global Header & Footer
        this.updateUIForScene(sceneId);

        // Scene Specific Logic
        // Scene Specific Logic
        if (sceneId !== 'scene-intro') {
            this.playTone('swoosh');
            this.playMusic();
        }
        if (sceneId === 'scene-level-select') {
            this.closeAllModals();
            this.stopTimer();
            this.renderLevelSelect();
        }
    },

    updateUIForScene: function (sceneId) {
        const headerTitle = document.getElementById('header-title');
        const headerStats = document.getElementById('header-stats');
        const footer = document.getElementById('app-footer');

        footer.innerHTML = ''; // Clear footer

        if (sceneId === 'scene-intro') {
            // HEADER
            headerTitle.style.display = 'block';
            headerTitle.textContent = 'Oyun Seçiniz';
            headerStats.style.display = 'none';

            // FOOTER: Row 1: [Hakkında] [Ayarlar], Row 2: [Oyunu Kapat]
            const btnAbout = document.createElement('button');

            // FOOTER: [Oyundan Çık]
            const btnExit = document.createElement('button');
            btnExit.className = 'footer-btn';
            btnExit.innerHTML = Icons.get('house') + ' Oyundan Çık';
            btnExit.onclick = () => this.showScene('scene-intro');

            footer.appendChild(btnExit);


        } else if (sceneId === 'scene-game') {
            // HEADER
            headerTitle.style.display = 'none';
            headerStats.style.display = 'flex';

            // FOOTER: [Geri]
            const btnBack = document.createElement('button');
            btnBack.className = 'footer-btn';
            btnBack.innerHTML = Icons.get('arrow-left') + ' Geri';
            btnBack.onclick = () => this.showScene('scene-level-select');

            footer.appendChild(btnBack);
        }
    },

    // --- MODALS ---

    showModal: function (modalId) {
        document.getElementById(modalId).classList.add('visible');
    },

    closeAllModals: function () {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('visible'));
    },

    toggleMute: function () {
        this.isMuted = !this.isMuted;
        localStorage.setItem('isMuted', this.isMuted);

        const btn = document.getElementById('mute-btn');
        if (this.isMuted) {
            btn.innerHTML = Icons.get('volume-xmark') + ' Sesi Aç';
            if (this.bgMusic) this.bgMusic.muted = true;
        } else {
            btn.innerHTML = Icons.get('volume-high') + ' Sesi Kapat';
            if (this.bgMusic) {
                this.bgMusic.muted = false;
                this.playMusic();
            }
        }
    },

    playMusic: function () {
        if (!this.isMuted && this.bgMusic && this.bgMusic.paused) {
            this.bgMusic.play().catch(e => console.log("Audio play failed:", e));
        }
    },

    resetProgress: function () {
        if (confirm('Tüm ilerlemeniz silinecek. Emin misiniz?')) {
            localStorage.clear();
            alert('İlerleme sıfırlandı.');
            location.reload();
        }
    },

    // --- GAME LOGIC ---

    renderLevelSelect: function () {
        const grid = document.querySelector('.level-grid');
        grid.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('div');
            btn.className = 'level-btn';
            btn.style.borderColor = this.levelColors[i];
            btn.style.color = this.levelColors[i];
            btn.onclick = () => this.startGame(i);

            const numSpan = document.createElement('span');
            numSpan.textContent = i;
            btn.appendChild(numSpan);

            const savedStars = localStorage.getItem(`level_${i}_stars`);
            if (savedStars) {
                const starContainer = document.createElement('div');
                starContainer.className = 'level-stars';
                let starStr = '';
                for (let s = 0; s < parseInt(savedStars); s++) starStr += '★';
                starContainer.textContent = starStr;
                btn.appendChild(starContainer);
            }

            grid.appendChild(btn);
        }
    },

    startGame: function (level) {
        this.currentLevel = level;
        this.correctCount = 0;
        this.score = 0;
        this.timer = 0;

        document.getElementById('score-display').textContent = 'Puan: 0';
        document.getElementById('timer-display').textContent = '00:00';

        this.showScene('scene-game');
        this.generateLevelData();
        this.startTimer();
    },

    startTimer: function () {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.timer++;
            const m = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const s = (this.timer % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').textContent = `${m}:${s}`;
        }, 1000);
    },

    stopTimer: function () {
        if (this.timerInterval) clearInterval(this.timerInterval);
    },

    generateLevelData: function () {
        const questionsCol = document.getElementById('questions-col');
        const answersCol = document.getElementById('answers-col');
        questionsCol.innerHTML = '';
        answersCol.innerHTML = '';

        let pairs = [];
        for (let i = 1; i <= 10; i++) {
            pairs.push({
                q: `${this.currentLevel} x ${i}`,
                a: this.currentLevel * i,
                id: i
            });
        }

        pairs.forEach(pair => {
            const qSlot = document.createElement('div');
            qSlot.className = 'question-slot';
            qSlot.textContent = `${pair.q} = ?`;
            qSlot.dataset.answer = pair.a;
            qSlot.dataset.id = pair.id;
            questionsCol.appendChild(qSlot);
        });

        const shuffledAnswers = [...pairs].sort(() => Math.random() - 0.5);
        const levelColor = this.levelColors[this.currentLevel];

        shuffledAnswers.forEach(pair => {
            const aContainer = document.createElement('div');
            aContainer.className = 'answer-container';

            const dragItem = document.createElement('div');
            dragItem.className = 'draggable-item';
            dragItem.textContent = pair.a;
            dragItem.dataset.val = pair.a;
            dragItem.style.backgroundColor = levelColor;

            dragItem.draggable = true;
            dragItem.addEventListener('dragstart', this.handleDragStart);

            dragItem.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            dragItem.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            dragItem.addEventListener('touchend', this.handleTouchEnd);

            aContainer.appendChild(dragItem);
            answersCol.appendChild(aContainer);
        });

        document.querySelectorAll('.question-slot').forEach(slot => {
            slot.addEventListener('dragover', this.handleDragOver);
            slot.addEventListener('drop', this.handleDrop);
            slot.addEventListener('dragenter', this.handleDragEnter);
            slot.addEventListener('dragleave', this.handleDragLeave);
        });
    },

    // --- DRAG & DROP ---
    draggedItem: null,
    touchOffset: { x: 0, y: 0 },
    clone: null,

    handleDragStart: function (e) {
        app.draggedItem = this;
        app.draggedItemColor = window.getComputedStyle(this).backgroundColor;
        e.dataTransfer.setData('text/plain', this.dataset.val);
        setTimeout(() => this.style.opacity = '0.5', 0);
        app.playTone('click');
    },

    handleDragEnter: function (e) {
        e.preventDefault();
        if (!this.classList.contains('filled')) {
            this.style.boxShadow = `inset 0px 0px 15px 2px ${app.draggedItemColor}`;
        }
    },

    handleDragLeave: function (e) {
        e.preventDefault();
        this.style.boxShadow = '';
    },

    handleDragOver: function (e) {
        e.preventDefault();
        if (!this.classList.contains('filled')) {
            this.style.boxShadow = `inset 0px 0px 15px 2px ${app.draggedItemColor}`;
        }
    },

    handleDrop: function (e) {
        e.preventDefault();
        this.style.boxShadow = '';
        const val = e.dataTransfer.getData('text/plain');
        app.checkAnswer(this, val, app.draggedItem);
    },

    handleTouchStart: function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        app.draggedItem = this;
        app.draggedItemColor = window.getComputedStyle(this).backgroundColor;
        app.playTone('click');

        app.clone = this.cloneNode(true);
        app.clone.classList.add('dragging');
        document.body.appendChild(app.clone);

        const rect = this.getBoundingClientRect();
        app.touchOffset.x = touch.clientX - rect.left;
        app.touchOffset.y = touch.clientY - rect.top;

        app.moveClone(touch.clientX, touch.clientY);
        this.style.opacity = '0';
    },

    handleTouchMove: function (e) {
        e.preventDefault();
        if (!app.clone) return;
        const touch = e.touches[0];
        app.moveClone(touch.clientX, touch.clientY);

        // Her harekette önce tüm vurgulamaları temizle
        app.clearHoverEffects();

        // Touch noktasının altındaki elementi bul
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const questionSlot = elemBelow ? elemBelow.closest('.question-slot') : null;

        if (questionSlot && !questionSlot.classList.contains('filled')) {
            // CSS class ekle
            questionSlot.classList.add('highlight');

            // Debug için konsola yaz (mobil tarayıcıda görmek için)
            console.log('Highlighting:', questionSlot.textContent);

            // Ekstra olarak inline style da ekle (daha güçlü, mobilde daha görünür)
            questionSlot.style.border = '5px solid #FFB900';
            questionSlot.style.backgroundColor = '#fff9e6';
            questionSlot.style.boxShadow = 'inset 0px 0px 20px 5px rgba(255, 200, 0, 0.9)';
            questionSlot.style.transform = 'scale(1.05)';
        }
    },

    handleTouchEnd: function (e) {
        if (!app.clone) return;

        app.clearHoverEffects();

        const touch = e.changedTouches[0];
        app.clone.style.display = 'none';
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        app.clone.style.display = 'block';

        const questionSlot = elemBelow ? elemBelow.closest('.question-slot') : null;

        if (questionSlot && !questionSlot.classList.contains('filled')) {
            app.checkAnswer(questionSlot, app.draggedItem.dataset.val, app.draggedItem);
        } else {
            app.resetDrag();
        }

        if (app.clone) {
            app.clone.remove();
            app.clone = null;
        }
    },

    moveClone: function (x, y) {
        if (app.clone) {
            app.clone.style.left = (x - app.touchOffset.x) + 'px';
            app.clone.style.top = (y - app.touchOffset.y) + 'px';
        }
    },

    resetDrag: function () {
        if (app.draggedItem) {
            app.draggedItem.style.opacity = '1';
            app.draggedItem = null;
        }
    },

    clearHoverEffects: function () {
        document.querySelectorAll('.question-slot').forEach(slot => {
            slot.style.boxShadow = '';
            slot.classList.remove('highlight');
            // Inline stilleri de temizle
            slot.style.border = '';
            slot.style.backgroundColor = '';
            slot.style.transform = '';
        });
    },

    checkAnswer: function (slot, val, itemElement) {
        const correctVal = slot.dataset.answer;
        if (val === correctVal) {
            this.playTone('success');
            this.updateScore(10);
            slot.classList.add('filled');
            slot.textContent = `${slot.textContent.split('=')[0]} = ${val}`;
            itemElement.remove();
            this.correctCount++;
            if (this.correctCount >= this.totalQuestions) this.gameWin();
        } else {
            this.playTone('error');
            this.updateScore(-2);
            slot.classList.add('wrong');
            setTimeout(() => slot.classList.remove('wrong'), 400);
            this.resetDrag();
        }
    },

    updateScore: function (points) {
        this.score += points;
        document.getElementById('score-display').textContent = `Puan: ${this.score}`;
    },

    gameWin: function () {
        this.stopTimer();
        setTimeout(() => {
            this.playTone('win');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

            let stars = 1;
            if (this.timer < 45) stars = 3;
            else if (this.timer < 90) stars = 2;

            const currentBest = localStorage.getItem(`level_${this.currentLevel}_stars`);
            if (!currentBest || stars > parseInt(currentBest)) {
                localStorage.setItem(`level_${this.currentLevel}_stars`, stars);
            }

            let starStr = '';
            for (let i = 0; i < stars; i++) starStr += '⭐';

            document.getElementById('modal-stars').textContent = starStr;
            document.getElementById('modal-final-score').textContent = `Süre: ${this.timer}sn | Puan: ${this.score}`;
            this.showModal('modal-success');
        }, 500);
    },

    playTone: function (type) {
        if (this.isMuted || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        const now = this.audioCtx.currentTime;

        if (type === 'success') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'error') {
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.2);
            gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'click') {
            osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'swoosh') {
            osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.3);
            gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'win') {
            this.playNote(523.25, 0, 0.2); this.playNote(659.25, 0.2, 0.2); this.playNote(783.99, 0.4, 0.4);
        }
    },

    playNote: function (freq, delay, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        const now = this.audioCtx.currentTime + delay;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.start(now); osc.stop(now + duration);
    }
};

app.init();
