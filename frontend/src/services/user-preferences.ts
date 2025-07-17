export interface UserPreferences {
  showLLMSelectionDialog: boolean;
}

export class UserPreferencesService {
  private static readonly STORAGE_KEY = 'userPreferences';
  
  private static getDefaultPreferences(): UserPreferences {
    return {
      showLLMSelectionDialog: true
    };
  }
  
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.getDefaultPreferences(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to parse user preferences from localStorage:', error);
    }
    return this.getDefaultPreferences();
  }
  
  static setPreferences(preferences: Partial<UserPreferences>): void {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save user preferences to localStorage:', error);
    }
  }
  
  static resetPreferences(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset user preferences:', error);
    }
  }
}

// Create a singleton instance
export const userPreferencesService = UserPreferencesService;