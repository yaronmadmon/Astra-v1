import { Command } from '../command/CommandTypes';

export type IntentMode = 'direct' | 'vague' | 'unknown';

export interface IntentContext {
  currentPages: string[];
  appName?: string;
}

export interface IntentSuggestion {
  label: string;
  command: string;
  description?: string;
}

export interface IntentResult {
  mode: IntentMode;
  commands: Command[];
  message?: string;
  suggestions?: IntentSuggestion[];
}

export class IntentAnalyzer {
  /**
   * Analyze user input and determine intent
   */
  static analyzeIntent(input: string, context: IntentContext): IntentResult {
    const trimmed = input.trim().toLowerCase();
    
    // Check for vague input first
    if (this.isVagueInput(trimmed)) {
      return {
        mode: 'vague',
        commands: [],
        message: "I'm not sure what you'd like to do. Here are some suggestions:",
        suggestions: this.generateSuggestions(context),
      };
    }
    
    // Try to parse as direct commands
    const command = this.tryParseCommand(trimmed, input.trim());
    
    if (command) {
      return {
        mode: 'direct',
        commands: [command],
        message: undefined,
        suggestions: undefined,
      };
    }
    
    // Unknown intent
    return {
      mode: 'unknown',
      commands: [],
      message: "I didn't understand that command. Try: 'add page <name>', 'rename page <old> to <new>', or 'delete page <name>'",
      suggestions: this.generateSuggestions(context),
    };
  }

  /**
   * Check if input is vague/ambiguous
   */
  static isVagueInput(input: string): boolean {
    // Very short inputs
    if (input.length < 3) return true;
    
    // Common vague phrases
    const vaguePhrases = [
      'add',
      'create',
      'make',
      'new',
      'page',
      'rename',
      'change',
      'delete',
      'remove',
      'help',
      'what',
      'how',
    ];
    
    // If input is just a vague phrase without context
    const words = input.split(/\s+/);
    if (words.length <= 2 && vaguePhrases.includes(words[0])) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate deterministic suggestions based on context
   */
  static generateSuggestions(context: IntentContext): IntentSuggestion[] {
    const suggestions: IntentSuggestion[] = [];
    
    // Always suggest common pages
    const commonPages = ['Settings', 'About', 'Contact', 'Dashboard'];
    const existingPageNames = context.currentPages.map(p => p.toLowerCase());
    
    for (const page of commonPages) {
      if (!existingPageNames.includes(page.toLowerCase())) {
        suggestions.push({
          label: `Add ${page} page`,
          command: `add page ${page}`,
          description: `Create a new ${page} page`,
        });
      }
    }
    
    // Suggest renaming if we have a "Home" page
    if (existingPageNames.includes('home')) {
      suggestions.push({
        label: 'Rename Home to Dashboard',
        command: 'rename page Home to Dashboard',
        description: 'Rename the Home page to Dashboard',
      });
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Try to parse input as a command
   */
  static tryParseCommand(trimmed: string, original: string): Command | null {
    // Try each parser in order
    return (
      this.tryParseAddPage(trimmed, original) ||
      this.tryParseRenamePage(trimmed, original) ||
      this.tryParseDeletePage(trimmed, original)
    );
  }

  /**
   * Parse "add page" commands with multiple phrase variations
   */
  static tryParseAddPage(trimmed: string, original: string): Command | null {
    // Patterns: "add page X", "create page X", "new page X", "make page X"
    const patterns = [
      /^(add|create|new|make)\s+page\s+(.+)$/i,
      /^add\s+(.+)\s+page$/i,
      /^create\s+(.+)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = original.match(pattern);
      if (match) {
        const pageName = match[match.length - 1].trim();
        if (pageName) {
          return {
            type: 'ADD_PAGE',
            payload: { pageName },
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse "rename page" commands with variations
   */
  static tryParseRenamePage(trimmed: string, original: string): Command | null {
    // Patterns: "rename page X to Y", "change page X to Y", "rename X to Y"
    const patterns = [
      /^(rename|change)\s+page\s+(.+?)\s+to\s+(.+)$/i,
      /^rename\s+(.+?)\s+to\s+(.+)$/i,
      /^change\s+(.+?)\s+to\s+(.+)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = original.match(pattern);
      if (match) {
        const oldName = match[match.length - 2].trim();
        const newName = match[match.length - 1].trim();
        if (oldName && newName) {
          return {
            type: 'RENAME_PAGE',
            payload: { oldName, newName },
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Parse "delete page" commands with variations
   */
  static tryParseDeletePage(trimmed: string, original: string): Command | null {
    // Patterns: "delete page X", "remove page X", "delete X", "remove X"
    const patterns = [
      /^(delete|remove)\s+page\s+(.+)$/i,
      /^delete\s+(.+)$/i,
      /^remove\s+(.+)$/i,
    ];
    
    for (const pattern of patterns) {
      const match = original.match(pattern);
      if (match) {
        const pageName = match[match.length - 1].trim();
        if (pageName) {
          return {
            type: 'DELETE_PAGE',
            payload: { pageName },
          };
        }
      }
    }
    
    return null;
  }
}

