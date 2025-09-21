/**
 * Feature Flags Service
 * Controls gradual rollout of accuracy improvements
 */
export class FeatureFlagsService {
  private flags: Map<string, boolean> = new Map();

  constructor() {
    // Initialize feature flags from environment or defaults
    this.initializeFlags();
  }

  private initializeFlags(): void {
    // Default flags for accuracy improvements - ENABLED BY DEFAULT for immediate fix
    this.flags.set('strict_archimate_parsing', process.env.ENABLE_STRICT_PARSING === 'true' || true);
    this.flags.set('precise_response_validation', process.env.ENABLE_RESPONSE_VALIDATION === 'true' || true);
    this.flags.set('query_intent_analysis', process.env.ENABLE_INTENT_ANALYSIS === 'true' || true);
    this.flags.set('improved_organizational_analysis', process.env.ENABLE_IMPROVED_ORG_ANALYSIS === 'true' || true);

    // Debug mode for development
    this.flags.set('debug_accuracy_mode', process.env.NODE_ENV === 'development');
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: string): boolean {
    return this.flags.get(flagName) || false;
  }

  /**
   * Enable a feature flag (for testing)
   */
  enable(flagName: string): void {
    this.flags.set(flagName, true);
  }

  /**
   * Disable a feature flag
   */
  disable(flagName: string): void {
    this.flags.set(flagName, false);
  }

  /**
   * Get all flags for debugging
   */
  getAllFlags(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }

  /**
   * Enable accuracy improvements (for gradual rollout)
   */
  enableAccuracyImprovements(): void {
    this.enable('strict_archimate_parsing');
    this.enable('precise_response_validation');
    this.enable('query_intent_analysis');
    this.enable('improved_organizational_analysis');
  }

  /**
   * Check if accuracy mode is fully enabled
   */
  isAccuracyModeEnabled(): boolean {
    return this.isEnabled('strict_archimate_parsing') &&
           this.isEnabled('precise_response_validation') &&
           this.isEnabled('query_intent_analysis');
  }
}

export default new FeatureFlagsService();