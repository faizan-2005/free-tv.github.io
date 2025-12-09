/**
 * Storage Manager for IPTV UI
 * Handles localStorage operations for favorites, recent, and settings
 */

const Storage = {
    KEYS: {
        FAVORITES: 'iptv_favorites',
        RECENT: 'iptv_recent',
        SETTINGS: 'iptv_settings',
        CACHE: 'iptv_cache'
    },

    MAX_RECENT: 20,

    /**
     * Get favorites list
     */
    getFavorites() {
        try {
            const data = localStorage.getItem(this.KEYS.FAVORITES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading favorites:', e);
            return [];
        }
    },

    /**
     * Add channel to favorites
     */
    addFavorite(channel) {
        const favorites = this.getFavorites();
        if (!favorites.find(f => f.url === channel.url)) {
            favorites.unshift({
                name: channel.name,
                url: channel.url,
                logo: channel.logo,
                group: channel.group,
                addedAt: Date.now()
            });
            localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
            return true;
        }
        return false;
    },

    /**
     * Remove channel from favorites
     */
    removeFavorite(channelUrl) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(f => f.url !== channelUrl);
        localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
    },

    /**
     * Check if channel is favorite
     */
    isFavorite(channelUrl) {
        const favorites = this.getFavorites();
        return favorites.some(f => f.url === channelUrl);
    },

    /**
     * Get recently watched list
     */
    getRecent() {
        try {
            const data = localStorage.getItem(this.KEYS.RECENT);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading recent:', e);
            return [];
        }
    },

    /**
     * Add channel to recently watched
     */
    addRecent(channel) {
        let recent = this.getRecent();
        
        // Remove if already exists
        recent = recent.filter(r => r.url !== channel.url);
        
        // Add to beginning
        recent.unshift({
            name: channel.name,
            url: channel.url,
            logo: channel.logo,
            group: channel.group,
            watchedAt: Date.now()
        });
        
        // Keep only MAX_RECENT items
        if (recent.length > this.MAX_RECENT) {
            recent = recent.slice(0, this.MAX_RECENT);
        }
        
        localStorage.setItem(this.KEYS.RECENT, JSON.stringify(recent));
    },

    /**
     * Clear recently watched
     */
    clearRecent() {
        localStorage.removeItem(this.KEYS.RECENT);
    },

    /**
     * Get settings
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (e) {
            console.error('Error reading settings:', e);
            return this.getDefaultSettings();
        }
    },

    /**
     * Save settings
     */
    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            theme: 'dark',
            resolution: 'auto',
            autoplay: true,
            rememberPosition: true,
            pinEnabled: false,
            pin: '0000',
            language: 'en',
            volume: 80
        };
    },

    /**
     * Cache channel data
     */
    cacheChannels(channels, expiryHours = 1) {
        const cacheData = {
            channels: channels,
            expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
        };
        try {
            localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cacheData));
        } catch (e) {
            console.error('Error caching channels:', e);
            // Clear cache if storage is full
            localStorage.removeItem(this.KEYS.CACHE);
        }
    },

    /**
     * Get cached channels
     */
    getCachedChannels() {
        try {
            const data = localStorage.getItem(this.KEYS.CACHE);
            if (!data) return null;
            
            const cacheData = JSON.parse(data);
            if (Date.now() > cacheData.expiry) {
                localStorage.removeItem(this.KEYS.CACHE);
                return null;
            }
            
            return cacheData.channels;
        } catch (e) {
            console.error('Error reading cache:', e);
            return null;
        }
    },

    /**
     * Clear all cache
     */
    clearCache() {
        localStorage.removeItem(this.KEYS.CACHE);
        localStorage.removeItem(this.KEYS.RECENT);
    },

    /**
     * Clear all data
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};

// Export for use
window.Storage = Storage;