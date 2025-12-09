/**
 * Video Player Module for IPTV
 * Handles HLS streaming and playback controls
 */

const Player = {
    // Player state
    state: {
        currentChannel: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isMuted: false
    },

    // HLS instance
    hls: null,

    // Video element
    videoElement: null,

    // Controls
    controlsVisible: true,
    controlsTimeout: null,
    controlsTimeoutDuration: 5000,

    /**
     * Initialize player
     */
    init() {
        try {
            console.log('Initializing Player...');
            
            // Get video element
            this.videoElement = document.getElementById('video-player');
            if (!this.videoElement) {
                console.error('Video player element not found');
                return;
            }

            // Setup HLS
            if (Hls.isSupported()) {
                this.hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });
                this.hls.attachMedia(this.videoElement);
            } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                // Safari native HLS support
                console.log('Using native HLS support');
            }

            // Setup video event listeners
            this.setupVideoListeners();

            // Setup player controls
            this.setupControls();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            console.log('Player initialized successfully');
        } catch (error) {
            console.error('Error initializing player:', error);
        }
    },

    /**
     * Setup video element event listeners
     */
    setupVideoListeners() {
        this.videoElement.addEventListener('play', () => {
            this.state.isPlaying = true;
            this.state.isPaused = false;
            this.updatePlayButton();
        });

        this.videoElement.addEventListener('pause', () => {
            this.state.isPaused = true;
            this.state.isPlaying = false;
            this.updatePlayButton();
        });

        this.videoElement.addEventListener('timeupdate', () => {
            this.state.currentTime = this.videoElement.currentTime;
            this.updateProgressBar();
        });

        this.videoElement.addEventListener('loadedmetadata', () => {
            this.state.duration = this.videoElement.duration;
            this.updateDuration();
        });

        this.videoElement.addEventListener('volumechange', () => {
            this.state.volume = this.videoElement.volume;
            this.state.isMuted = this.videoElement.muted;
            this.updateVolumeButton();
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error('Video playback error:', e);
            this.showPlayerError('Playback error: ' + (e.target.error?.message || 'Unknown error'));
        });

        if (this.hls) {
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed successfully');
                this.videoElement.play().catch(err => {
                    console.warn('Autoplay blocked:', err);
                });
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS error:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Network error');
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Media error');
                            break;
                    }
                }
            });
        }
    },

    /**
     * Setup player controls
     */
    setupControls() {
        const controls = document.getElementById('player-controls');
        if (!controls) return;

        // Play/Pause button
        const playBtn = controls.querySelector('.player-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Mute button
        const muteBtn = controls.querySelector('.player-mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }

        // Volume slider
        const volumeSlider = controls.querySelector('.player-volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(parseFloat(e.target.value) / 100);
            });
        }

        // Fullscreen button
        const fullscreenBtn = controls.querySelector('.player-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Progress bar
        const progressBar = controls.querySelector('.player-progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                this.seek(e);
            });
        }

        // Close button
        const closeBtn = controls.querySelector('.player-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePlayer());
        }

        // Auto-hide controls on mouse move
        const playerContainer = document.getElementById('player-container');
        if (playerContainer) {
            playerContainer.addEventListener('mousemove', () => {
                this.showControls();
            });

            playerContainer.addEventListener('mouseleave', () => {
                if (this.state.isPlaying) {
                    this.hideControls();
                }
            });
        }
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only in player mode
            if (!this.state.currentChannel) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'm':
                    this.toggleMute();
                    break;
                case 'f':
                    this.toggleFullscreen();
                    break;
                case 'Escape':
                    this.closePlayer();
                    break;
                case 'ArrowRight':
                    this.skip(10);
                    break;
                case 'ArrowLeft':
                    this.skip(-10);
                    break;
                case 'ArrowUp':
                    this.changeVolume(0.1);
                    break;
                case 'ArrowDown':
                    this.changeVolume(-0.1);
                    break;
            }
        });
    },

    /**
     * Play a channel
     */
    play(channel) {
        try {
            console.log('Playing channel:', channel.name);

            this.state.currentChannel = channel;

            // Update channel info in UI
            const channelName = document.getElementById('current-channel-name');
            if (channelName) {
                channelName.textContent = channel.name;
            }

            const channelLogo = document.getElementById('current-channel-logo');
            if (channelLogo && channel.logo) {
                channelLogo.src = channel.logo;
            }

            // Load video
            if (this.hls && channel.url.includes('.m3u8')) {
                // HLS stream
                this.hls.loadSource(channel.url);
            } else {
                // Direct stream or other format
                this.videoElement.src = channel.url;
            }

            this.videoElement.play().catch(err => {
                console.error('Playback failed:', err);
                this.showPlayerError('Failed to start playback');
            });

            this.showControls();
        } catch (error) {
            console.error('Error playing channel:', error);
            this.showPlayerError('Error loading channel');
        }
    },

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!this.videoElement) return;

        if (this.state.isPlaying) {
            this.videoElement.pause();
        } else {
            this.videoElement.play().catch(err => {
                console.warn('Play failed:', err);
            });
        }
    },

    /**
     * Toggle mute
     */
    toggleMute() {
        if (!this.videoElement) return;
        this.videoElement.muted = !this.videoElement.muted;
    },

    /**
     * Set volume (0-1)
     */
    setVolume(value) {
        if (!this.videoElement) return;
        this.videoElement.volume = Math.max(0, Math.min(1, value));
        if (value > 0) {
            this.videoElement.muted = false;
        }
    },

    /**
     * Change volume by delta
     */
    changeVolume(delta) {
        const newVolume = this.state.volume + delta;
        this.setVolume(newVolume);
        this.updateVolumeDisplay();
    },

    /**
     * Seek to time
     */
    seek(event) {
        if (!this.videoElement || !this.state.duration) return;

        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        const time = percentage * this.state.duration;

        this.videoElement.currentTime = Math.max(0, Math.min(time, this.state.duration));
    },

    /**
     * Skip forward/backward
     */
    skip(seconds) {
        if (!this.videoElement) return;
        this.videoElement.currentTime = Math.max(0, 
            Math.min(this.videoElement.currentTime + seconds, this.state.duration)
        );
    },

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        const playerContainer = document.getElementById('player-container');
        if (!playerContainer) return;

        if (!document.fullscreenElement) {
            playerContainer.requestFullscreen().catch(err => {
                console.warn('Fullscreen request failed:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Close player
     */
    closePlayer() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
        }

        this.state.currentChannel = null;
        this.state.isPlaying = false;

        // Switch back to home section
        if (window.App && typeof App.switchSection === 'function') {
            App.switchSection('home');
        }
    },

    /**
     * Update play button state
     */
    updatePlayButton() {
        const playBtn = document.querySelector('.player-play-btn');
        if (!playBtn) return;

        const icon = playBtn.querySelector('svg');
        if (!icon) return;

        if (this.state.isPlaying) {
            // Show pause icon
            playBtn.innerHTML = `
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
        } else {
            // Show play icon
            playBtn.innerHTML = `
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
    },

    /**
     * Update volume button
     */
    updateVolumeButton() {
        const muteBtn = document.querySelector('.player-mute-btn');
        if (!muteBtn) return;

        if (this.state.isMuted || this.state.volume === 0) {
            muteBtn.classList.add('text-gray-400');
            muteBtn.classList.remove('text-primary');
        } else {
            muteBtn.classList.remove('text-gray-400');
            muteBtn.classList.add('text-primary');
        }
    },

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const progressBar = document.querySelector('.player-progress-current');
        if (!progressBar || !this.state.duration) return;

        const percentage = (this.state.currentTime / this.state.duration) * 100;
        progressBar.style.width = percentage + '%';

        // Update time display
        const timeDisplay = document.getElementById('current-time');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(this.state.currentTime);
        }
    },

    /**
     * Update duration display
     */
    updateDuration() {
        const durationDisplay = document.getElementById('total-time');
        if (durationDisplay) {
            durationDisplay.textContent = this.formatTime(this.state.duration);
        }
    },

    /**
     * Update volume display
     */
    updateVolumeDisplay() {
        const volumeSlider = document.querySelector('.player-volume-slider');
        if (volumeSlider) {
            volumeSlider.value = this.state.volume * 100;
        }
    },

    /**
     * Show controls
     */
    showControls() {
        const controls = document.getElementById('player-controls');
        if (controls) {
            controls.classList.remove('opacity-0', 'pointer-events-none');
        }

        this.controlsVisible = true;

        // Clear existing timeout
        clearTimeout(this.controlsTimeout);

        // Auto-hide after delay if playing
        if (this.state.isPlaying) {
            this.controlsTimeout = setTimeout(() => {
                this.hideControls();
            }, this.controlsTimeoutDuration);
        }
    },

    /**
     * Hide controls
     */
    hideControls() {
        const controls = document.getElementById('player-controls');
        if (controls) {
            controls.classList.add('opacity-0', 'pointer-events-none');
        }
        this.controlsVisible = false;
    },

    /**
     * Show player error
     */
    showPlayerError(message) {
        const errorEl = document.getElementById('player-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 5000);
        } else {
            console.error('Player error:', message);
        }
    },

    /**
     * Format time in seconds to MM:SS
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
};

// Initialize player when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Player.init();
    });
} else {
    Player.init();
}
