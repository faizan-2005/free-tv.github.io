/**
 * M3U Playlist Parser for IPTV UI
 * Fetches and parses M3U/M3U8 playlists
 */

const M3UParser = {
    // Playlist URL
    PLAYLIST_URL: 'https://iptv-org.github.io/iptv/index.m3u8',
    
    // CORS Proxy (if needed)
    CORS_PROXIES: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        ''  // Try direct if proxies fail
    ],

    /**
     * Fetch and parse playlist
     */
    async fetchPlaylist(url = this.PLAYLIST_URL) {
        // Check cache first
        const cached = Storage.getCachedChannels();
        if (cached && cached.length > 0) {
            console.log('Using cached channels:', cached.length);
            return cached;
        }

        let lastError = null;

        // Try each proxy
        for (const proxy of this.CORS_PROXIES) {
            try {
                const fetchUrl = proxy + encodeURIComponent(url);
                console.log('Fetching playlist from:', fetchUrl);
                
                const response = await fetch(proxy ? fetchUrl : url, {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const content = await response.text();
                const channels = this.parse(content);
                
                if (channels.length > 0) {
                    // Cache the results
                    Storage.cacheChannels(channels);
                    console.log('Parsed channels:', channels.length);
                    return channels;
                }
            } catch (error) {
                console.warn('Proxy failed:', proxy, error.message);
                lastError = error;
            }
        }

        // If all proxies fail, try PHP proxy
        try {
            const response = await fetch('php/proxy.php?url=' + encodeURIComponent(url));
            if (response.ok) {
                const content = await response.text();
                const channels = this.parse(content);
                if (channels.length > 0) {
                    Storage.cacheChannels(channels);
                    return channels;
                }
            }
        } catch (error) {
            console.warn('PHP proxy failed:', error.message);
        }

        throw lastError || new Error('Failed to fetch playlist');
    },

    /**
     * Parse M3U content
     */
    parse(content) {
        const channels = [];
        const lines = content.split('\n');
        
        let currentChannel = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Parse EXTINF line
            if (line.startsWith('#EXTINF:')) {
                currentChannel = this.parseExtInf(line);
            }
            // Parse stream URL
            else if (line.startsWith('http') && currentChannel) {
                currentChannel.url = line;
                currentChannel.id = this.generateId(currentChannel);
                channels.push(currentChannel);
                currentChannel = null;
            }
        }

        return channels;
    },

    /**
     * Parse EXTINF line
     */
    parseExtInf(line) {
        const channel = {
            name: 'Unknown Channel',
            logo: '',
            group: 'Uncategorized',
            language: '',
            country: '',
            tvgId: '',
            tvgName: ''
        };

        // Extract attributes using regex
        const attrRegex = /([a-zA-Z-]+)="([^"]*)"/g;
        let match;

        while ((match = attrRegex.exec(line)) !== null) {
            const [, key, value] = match;
            switch (key.toLowerCase()) {
                case 'tvg-logo':
                    channel.logo = value;
                    break;
                case 'tvg-name':
                    channel.tvgName = value;
                    break;
                case 'tvg-id':
                    channel.tvgId = value;
                    break;
                case 'group-title':
                    channel.group = value || 'Uncategorized';
                    break;
                case 'tvg-language':
                    channel.language = value;
                    break;
                case 'tvg-country':
                    channel.country = value;
                    break;
            }
        }

        // Extract channel name (after the comma)
        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) {
            channel.name = nameMatch[1].trim();
        }

        // Use tvg-name if name is not available
        if (channel.name === 'Unknown Channel' && channel.tvgName) {
            channel.name = channel.tvgName;
        }

        return channel;
    },

    /**
     * Generate unique ID for channel
     */
    generateId(channel) {
        const str = channel.name + channel.url;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'ch_' + Math.abs(hash).toString(36);
    },

    /**
     * Get unique groups/categories
     */
    getGroups(channels) {
        const groups = new Map();
        
        channels.forEach(channel => {
            const group = channel.group || 'Uncategorized';
            if (groups.has(group)) {
                groups.set(group, groups.get(group) + 1);
            } else {
                groups.set(group, 1);
            }
        });

        return Array.from(groups.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Filter channels by group
     */
    filterByGroup(channels, group) {
        if (!group || group === 'all') {
            return channels;
        }
        return channels.filter(ch => ch.group === group);
    },

    /**
     * Search channels
     */
    search(channels, query) {
        if (!query || query.trim() === '') {
            return [];
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return channels.filter(channel => {
            return channel.name.toLowerCase().includes(searchTerm) ||
                   channel.group.toLowerCase().includes(searchTerm) ||
                   (channel.country && channel.country.toLowerCase().includes(searchTerm)) ||
                   (channel.language && channel.language.toLowerCase().includes(searchTerm));
        });
    }
};

// Export for use
window.M3UParser = M3UParser;