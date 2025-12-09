/**
 * Main Application Entry Point
 * Initializes and manages the IPTV Smart TV application
 */

const App = {
    // Application state
    state: {
        isLoading: true,
        currentChannel: null,
        channels: [],
        selectedChannels: [],
        currentSection: 'home'
    },

    // Configuration
    config: {
        loadingTimeout: 5000,
        channelCheckInterval: 30000,
        minChannelsToLoad: 10
    },

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing IPTV Application...');
            
            // Initialize storage
            this.initStorage();
            
            // Setup UI event listeners
            this.setupUIListeners();
            
            // Initialize navigation system
            Navigation.init();
            
            // Load channels
            await this.loadChannels();
            
            // Initialize player
            if (window.Player && typeof Player.init === 'function') {
                Player.init();
            }
            
            // Show main app
            this.showApp();
            
            // Setup auto-refresh for channels
            this.setupChannelRefresh();
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize application');
        }
    },

    /**
     * Initialize storage system
     */
    initStorage() {
        if (!window.Storage) {
            console.error('Storage module not loaded');
            return;
        }
        
        // Check if storage is accessible
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (e) {
            console.warn('localStorage not available, using in-memory fallback');
        }
    },

    /**
     * Setup UI event listeners
     */
    setupUIListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(btn.dataset.section);
            });
        });

        // Section toggle buttons
        document.querySelectorAll('[data-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.section;
                if (section) {
                    this.switchSection(section);
                }
            });
        });

        // Close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.dataset.close;
                const modal = document.getElementById(`${section}-modal`) || document.getElementById(`${section}-section`);
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Playlist upload
        const playlistInput = document.getElementById('playlist-file');
        if (playlistInput) {
            playlistInput.addEventListener('change', (e) => {
                this.handlePlaylistUpload(e);
            });
        }

        // Playlist URL input
        const playlistUrlBtn = document.getElementById('playlist-url-btn');
        if (playlistUrlBtn) {
            playlistUrlBtn.addEventListener('click', () => {
                this.handlePlaylistUrlInput();
            });
        }
    },

    /**
     * Load channels from M3U parser
     */
    async loadChannels() {
        try {
            console.log('Loading channels...');
            
            if (!window.M3UParser) {
                throw new Error('M3U Parser module not loaded');
            }

            this.state.channels = await M3UParser.fetchPlaylist();
            
            if (this.state.channels.length > 0) {
                console.log(`Loaded ${this.state.channels.length} channels`);
                this.renderChannels('home');
            } else {
                console.warn('No channels loaded');
                this.showError('No channels available');
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            this.showError('Failed to load channels');
        }
    },

    /**
     * Render channels in current section
     */
    renderChannels(section = 'home') {
        const container = document.getElementById(`${section}-channels`);
        if (!container) {
            console.warn(`Container for section ${section} not found`);
            return;
        }

        // Get channels based on section
        let channelsToShow = this.state.channels;
        
        if (section === 'favorites') {
            const favorites = Storage.getFavorites();
            channelsToShow = this.state.channels.filter(ch => 
                favorites.some(f => f.url === ch.url)
            );
        } else if (section === 'recent') {
            const recent = Storage.getRecent();
            channelsToShow = this.state.channels.filter(ch => 
                recent.some(r => r.url === ch.url)
            );
        }

        container.innerHTML = '';

        if (channelsToShow.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-8">No channels available</p>';
            return;
        }

        channelsToShow.forEach((channel, index) => {
            const isFavorite = Storage.getFavorites().some(f => f.url === channel.url);
            const channelEl = document.createElement('div');
            channelEl.className = 'channel-card focusable relative overflow-hidden rounded-lg cursor-pointer transition-all group';
            channelEl.innerHTML = `
                <div class="aspect-square bg-gradient-to-br from-surface-light to-surface overflow-hidden relative">
                    ${channel.logo ? `<img src="${channel.logo}" alt="${channel.name}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-gray-500"><span class="text-center px-2">${channel.name}</span></div>`}
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button class="play-btn bg-primary rounded-full p-4 transform scale-0 group-hover:scale-100 transition-transform">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="p-3 bg-surface-light group-hover:bg-surface transition-colors">
                    <p class="text-tv-sm font-semibold truncate">${channel.name}</p>
                    <div class="flex items-center justify-between mt-2">
                        <p class="text-tv-xs text-gray-400 truncate">${channel.group || 'No Group'}</p>
                        <button class="favorite-btn ${isFavorite ? 'text-primary' : 'text-gray-400'} hover:text-primary transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Play button handler
            const playBtn = channelEl.querySelector('.play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playChannel(channel);
                });
            }

            // Favorite button handler
            const favoriteBtn = channelEl.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(channel, favoriteBtn);
                });
            }

            // Main click to play
            channelEl.addEventListener('click', () => {
                this.playChannel(channel);
            });

            container.appendChild(channelEl);
        });

        // Re-initialize navigation after rendering
        if (window.Navigation && typeof Navigation.updateFocusableElements === 'function') {
            Navigation.updateFocusableElements();
        }
    },

    /**
     * Play a channel
     */
    playChannel(channel) {
        console.log('Playing channel:', channel.name);
        
        this.state.currentChannel = channel;
        
        // Add to recent
        Storage.addRecent(channel);
        
        // Switch to player section
        this.switchSection('player');
        
        // Start playback
        if (window.Player && typeof Player.play === 'function') {
            Player.play(channel);
        } else {
            // Fallback: open URL
            console.warn('Player module not loaded, opening URL directly');
            window.open(channel.url, '_blank');
        }
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite(channel, btnElement) {
        const favorites = Storage.getFavorites();
        const isFavorite = favorites.some(f => f.url === channel.url);
        
        if (isFavorite) {
            Storage.removeFavorite(channel);
            btnElement?.classList.remove('text-primary');
            btnElement?.classList.add('text-gray-400');
        } else {
            Storage.addFavorite(channel);
            btnElement?.classList.remove('text-gray-400');
            btnElement?.classList.add('text-primary');
        }
        
        // Re-render if in favorites section
        if (this.state.currentSection === 'favorites') {
            this.renderChannels('favorites');
        }
    },

    /**
     * Switch to a section
     */
    switchSection(section) {
        // Hide all sections
        document.querySelectorAll('[id$="-section"]').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show selected section
        const sectionEl = document.getElementById(`${section}-section`);
        if (sectionEl) {
            sectionEl.classList.remove('hidden');
        }
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === section) {
                btn.classList.add('active');
            }
        });
        
        this.state.currentSection = section;
        
        // Re-initialize navigation
        if (window.Navigation && typeof Navigation.updateFocusableElements === 'function') {
            Navigation.updateFocusableElements();
            Navigation.focusFirst();
        }
    },

    /**
     * Handle playlist file upload
     */
    async handlePlaylistUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const content = await file.text();
            const channels = M3UParser.parse(content);
            
            if (channels.length > 0) {
                this.state.channels = channels;
                Storage.setCachedChannels(channels);
                this.renderChannels('home');
                this.showMessage(`Loaded ${channels.length} channels`);
            } else {
                this.showError('No channels found in file');
            }
        } catch (error) {
            console.error('Error reading playlist file:', error);
            this.showError('Failed to read playlist file');
        }
    },

    /**
     * Handle playlist URL input
     */
    async handlePlaylistUrlInput() {
        const url = prompt('Enter playlist URL (M3U/M3U8):');
        if (!url) return;

        try {
            const channels = await M3UParser.fetchPlaylist(url);
            
            if (channels.length > 0) {
                this.state.channels = channels;
                Storage.setCachedChannels(channels);
                this.renderChannels('home');
                this.showMessage(`Loaded ${channels.length} channels`);
            } else {
                this.showError('No channels found in playlist');
            }
        } catch (error) {
            console.error('Error loading playlist:', error);
            this.showError('Failed to load playlist');
        }
    },

    /**
     * Setup automatic channel refresh
     */
    setupChannelRefresh() {
        setInterval(() => {
            console.log('Checking for channel updates...');
            // Could refresh channels periodically
        }, this.config.channelCheckInterval);
    },

    /**
     * Show main app
     */
    showApp() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        // Render home section by default
        this.renderChannels('home');
    },

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        
        // Try to show in UI
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 5000);
        } else {
            alert(message);
        }
    },

    /**
     * Show success message
     */
    showMessage(message) {
        console.log(message);
        
        // Try to show in UI
        const msgEl = document.getElementById('success-message');
        if (msgEl) {
            msgEl.textContent = message;
            msgEl.classList.remove('hidden');
            setTimeout(() => {
                msgEl.classList.add('hidden');
            }, 3000);
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        App.init();
    });
} else {
    App.init();
}
