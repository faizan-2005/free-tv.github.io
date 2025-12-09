/**
 * Navigation Manager for IPTV UI
 * Handles keyboard/remote control navigation
 */

const Navigation = {
    // Current focused element
    focusedElement: null,
    
    // Focus history for back navigation
    focusHistory: [],
    
    // Navigation grid
    grid: [],
    
    // Current position
    currentRow: 0,
    currentCol: 0,
    
    // Current section
    currentSection: 'home',
    
    // Player mode
    isPlayerActive: false,
    
    // Controls visibility timeout
    controlsTimeout: null,

    /**
     * Initialize navigation
     */
    init() {
        this.bindKeyboardEvents();
        this.updateFocusableElements();
        this.focusFirst();
    },

    /**
     * Bind keyboard events
     */
    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Prevent default for navigation keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case 'ArrowUp':
                    this.navigate('up');
                    break;
                case 'ArrowDown':
                    this.navigate('down');
                    break;
                case 'ArrowLeft':
                    this.navigate('left');
                    break;
                case 'ArrowRight':
                    this.navigate('right');
                    break;
                case 'Enter':
                    this.select();
                    break;
                case 'Escape':
                case 'Backspace':
                    this.back();
                    break;
                case 'f':
                case 'F':
                    this.toggleFavorite();
                    break;
                case 'p':
                case 'P':
                case ' ':
                    if (this.isPlayerActive) {
                        window.Player.togglePlay();
                    }
                    break;
                case 'm':
                case 'M':
                    if (this.isPlayerActive) {
                        window.Player.toggleMute();
                    }
                    break;
            }

            // Show controls on any key press in player mode
            if (this.isPlayerActive) {
                window.Player.showControls();
            }
        });

        // Mouse/touch support for focus
        document.addEventListener('click', (e) => {
            const focusable = e.target.closest('.focusable');
            if (focusable) {
                this.setFocus(focusable);
            }
        });

        // Handle focus on focusable elements
        document.querySelectorAll('.focusable').forEach(el => {
            el.addEventListener('focus', () => {
                this.setFocus(el);
            });
        });
    },

    /**
     * Update focusable elements grid
     */
    updateFocusableElements() {
        const section = document.querySelector(`.section.active, #player-overlay:not(.hidden)`);
        if (!section) return;

        // Get all focusable elements in current section
        let focusables;
        
        if (this.isPlayerActive) {
            focusables = document.querySelectorAll('#player-overlay .focusable');
        } else {
            // Include header navigation
            const headerFocusables = document.querySelectorAll('#main-nav .focusable');
            const sectionFocusables = document.querySelectorAll(`.section.active .focusable`);
            focusables = [...headerFocusables, ...sectionFocusables];
        }

        // Build grid based on visual position
        this.grid = [];
        
        focusables.forEach(el => {
            const rect = el.getBoundingClientRect();
            const row = Math.floor(rect.top / 80); // Approximate row grouping
            
            if (!this.grid[row]) {
                this.grid[row] = [];
            }
            this.grid[row].push(el);
        });

        // Sort each row by horizontal position
        this.grid = this.grid.filter(row => row && row.length > 0);
        this.grid.forEach(row => {
            row.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return rectA.left - rectB.left;
            });
        });
    },

    /**
     * Navigate in direction
     */
    navigate(direction) {
        if (this.grid.length === 0) {
            this.updateFocusableElements();
            if (this.grid.length === 0) return;
        }

        const currentEl = this.focusedElement;
        let nextEl = null;

        // Find current position in grid
        for (let row = 0; row < this.grid.length; row++) {
            const col = this.grid[row].indexOf(currentEl);
            if (col !== -1) {
                this.currentRow = row;
                this.currentCol = col;
                break;
            }
        }

        switch (direction) {
            case 'up':
                if (this.currentRow > 0) {
                    this.currentRow--;
                    this.currentCol = Math.min(this.currentCol, this.grid[this.currentRow].length - 1);
                    nextEl = this.grid[this.currentRow][this.currentCol];
                }
                break;
            case 'down':
                if (this.currentRow < this.grid.length - 1) {
                    this.currentRow++;
                    this.currentCol = Math.min(this.currentCol, this.grid[this.currentRow].length - 1);
                    nextEl = this.grid[this.currentRow][this.currentCol];
                }
                break;
            case 'left':
                if (this.currentCol > 0) {
                    this.currentCol--;
                    nextEl = this.grid[this.currentRow][this.currentCol];
                } else if (this.currentRow > 0) {
                    // Wrap to end of previous row
                    this.currentRow--;
                    this.currentCol = this.grid[this.currentRow].length - 1;
                    nextEl = this.grid[this.currentRow][this.currentCol];
                }
                break;
            case 'right':
                if (this.currentCol < this.grid[this.currentRow].length - 1) {
                    this.currentCol++;
                    nextEl = this.grid[this.currentRow][this.currentCol];
                } else if (this.currentRow < this.grid.length - 1) {
                    // Wrap to start of next row
                    this.currentRow++;
                    this.currentCol = 0;
                    nextEl = this.grid[this.currentRow][this.currentCol];
                }
                break;
        }

        if (nextEl && nextEl !== currentEl) {
            this.setFocus(nextEl);
        }
    },

    /**
     * Set focus on element
     */
    setFocus(element) {
        if (!element) return;

        // Remove focus from current element
        if (this.focusedElement) {
            this.focusedElement.classList.remove('focused');
        }

        // Set new focus
        this.focusedElement = element;
        element.classList.add('focused');

        // Scroll into view if needed
        this.scrollIntoView(element);

        // Handle special focus actions
        this.handleFocusAction(element);
    },

    /**
     * Scroll element into view
     */
    scrollIntoView(element) {
        const rect = element.getBoundingClientRect();
        const viewHeight = window.innerHeight;
        const viewWidth = window.innerWidth;

        // Check if element is fully visible
        if (rect.top < 120 || rect.bottom > viewHeight - 80) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

        if (rect.left < 0 || rect.right > viewWidth) {
            element.scrollIntoView({
                behavior: 'smooth',
                inline: 'center'
            });
        }
    },

    /**
     * Handle focus action
     */
    handleFocusAction(element) {
        // Channel preview on focus
        if (element.classList.contains('channel-card')) {
            // Could add preview functionality here
        }
    },

    /**
     * Select current focused element
     */
    select() {
        if (!this.focusedElement) return;

        // Trigger click
        this.focusedElement.click();

        // Add to history for back navigation
        this.focusHistory.push({
            element: this.focusedElement,
            section: this.currentSection
        });

        // Keep history limited
        if (this.focusHistory.length > 20) {
            this.focusHistory.shift();
        }
    },

    /**
     * Go back
     */
    back() {
        // If player is active, close it
        if (this.isPlayerActive) {
            window.Player.close();
            return;
        }

        // If not on home section, go to home
        if (this.currentSection !== 'home') {
            window.App.showSection('home');
            return;
        }

        // Otherwise, focus on previous element
        if (this.focusHistory.length > 0) {
            const last = this.focusHistory.pop();
            if (last.element && document.contains(last.element)) {
                this.setFocus(last.element);
            }
        }
    },

    /**
     * Toggle favorite for current channel
     */
    toggleFavorite() {
        const channelCard = this.focusedElement?.closest('.channel-card');
        if (channelCard) {
            const favoriteBtn = channelCard.querySelector('[data-action="favorite"]');
            if (favoriteBtn) {
                favoriteBtn.click();
            }
        }
    },

    /**
     * Focus first element
     */
    focusFirst() {
        this.updateFocusableElements();
        
        if (this.grid.length > 0 && this.grid[0].length > 0) {
            this.setFocus(this.grid[0][0]);
        }
    },

    /**
     * Focus specific element
     */
    focusElement(selector) {
        const element = document.querySelector(selector);
        if (element && element.classList.contains('focusable')) {
            this.updateFocusableElements();
            this.setFocus(element);
        }
    },

    /**
     * Set current section
     */
    setSection(section) {
        this.currentSection = section;
        setTimeout(() => {
            this.updateFocusableElements();
            this.focusFirst();
        }, 100);
    },

    /**
     * Enter player mode
     */
    enterPlayerMode() {
        this.isPlayerActive = true;
        setTimeout(() => {
            this.updateFocusableElements();
            this.focusElement('#player-playpause');
        }, 100);
    },

    /**
     * Exit player mode
     */
    exitPlayerMode() {
        this.isPlayerActive = false;
        setTimeout(() => {
            this.updateFocusableElements();
        }, 100);
    }
};

// Export for use
window.Navigation = Navigation;