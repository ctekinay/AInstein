import { FeatureFlagsService } from '../services/feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;

    // Reset environment for each test
    process.env = {
      ...originalEnv,
      ENABLE_STRICT_PARSING: undefined,
      ENABLE_RESPONSE_VALIDATION: undefined,
      ENABLE_INTENT_ANALYSIS: undefined,
      ENABLE_IMPROVED_ORG_ANALYSIS: undefined,
      NODE_ENV: 'test'
    };

    service = new FeatureFlagsService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Flag Initialization', () => {
    it('should initialize with default false values in test environment', () => {
      expect(service.isEnabled('strict_archimate_parsing')).toBe(false);
      expect(service.isEnabled('precise_response_validation')).toBe(false);
      expect(service.isEnabled('query_intent_analysis')).toBe(false);
      expect(service.isEnabled('improved_organizational_analysis')).toBe(false);
    });

    it('should read environment variables correctly', () => {
      process.env.ENABLE_STRICT_PARSING = 'true';
      process.env.ENABLE_RESPONSE_VALIDATION = 'true';

      const newService = new FeatureFlagsService();

      expect(newService.isEnabled('strict_archimate_parsing')).toBe(true);
      expect(newService.isEnabled('precise_response_validation')).toBe(true);
      expect(newService.isEnabled('query_intent_analysis')).toBe(false);
    });

    it('should handle debug mode in development', () => {
      process.env.NODE_ENV = 'development';

      const devService = new FeatureFlagsService();

      expect(devService.isEnabled('debug_accuracy_mode')).toBe(true);
    });

    it('should disable debug mode in production', () => {
      process.env.NODE_ENV = 'production';

      const prodService = new FeatureFlagsService();

      expect(prodService.isEnabled('debug_accuracy_mode')).toBe(false);
    });
  });

  describe('Flag Management', () => {
    it('should enable flags programmatically', () => {
      expect(service.isEnabled('strict_archimate_parsing')).toBe(false);

      service.enable('strict_archimate_parsing');

      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);
    });

    it('should disable flags programmatically', () => {
      service.enable('strict_archimate_parsing');
      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);

      service.disable('strict_archimate_parsing');

      expect(service.isEnabled('strict_archimate_parsing')).toBe(false);
    });

    it('should handle non-existent flags gracefully', () => {
      expect(service.isEnabled('non_existent_flag')).toBe(false);

      service.enable('non_existent_flag');
      expect(service.isEnabled('non_existent_flag')).toBe(true);
    });
  });

  describe('Accuracy Improvements Bundle', () => {
    it('should enable all accuracy improvements together', () => {
      service.enableAccuracyImprovements();

      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);
      expect(service.isEnabled('precise_response_validation')).toBe(true);
      expect(service.isEnabled('query_intent_analysis')).toBe(true);
      expect(service.isEnabled('improved_organizational_analysis')).toBe(true);
    });

    it('should correctly detect when accuracy mode is fully enabled', () => {
      expect(service.isAccuracyModeEnabled()).toBe(false);

      service.enable('strict_archimate_parsing');
      service.enable('precise_response_validation');
      expect(service.isAccuracyModeEnabled()).toBe(false); // Still missing one flag

      service.enable('query_intent_analysis');
      expect(service.isAccuracyModeEnabled()).toBe(true);
    });

    it('should require all core flags for accuracy mode', () => {
      service.enable('strict_archimate_parsing');
      service.enable('precise_response_validation');
      // Missing query_intent_analysis

      expect(service.isAccuracyModeEnabled()).toBe(false);
    });
  });

  describe('Flag Inspection', () => {
    it('should return all flags with their current state', () => {
      service.enable('strict_archimate_parsing');
      service.enable('query_intent_analysis');

      const allFlags = service.getAllFlags();

      expect(allFlags).toHaveProperty('strict_archimate_parsing', true);
      expect(allFlags).toHaveProperty('precise_response_validation', false);
      expect(allFlags).toHaveProperty('query_intent_analysis', true);
      expect(allFlags).toHaveProperty('improved_organizational_analysis', false);
      expect(allFlags).toHaveProperty('debug_accuracy_mode');
    });

    it('should return consistent flag states', () => {
      const initialFlags = service.getAllFlags();

      service.enable('strict_archimate_parsing');
      const afterEnableFlags = service.getAllFlags();

      expect(afterEnableFlags.strict_archimate_parsing).toBe(true);
      expect(afterEnableFlags.precise_response_validation).toBe(initialFlags.precise_response_validation);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support gradual rollout pattern', () => {
      // Phase 1: Enable basic parsing improvements
      service.enable('strict_archimate_parsing');
      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);
      expect(service.isAccuracyModeEnabled()).toBe(false);

      // Phase 2: Add response validation
      service.enable('precise_response_validation');
      expect(service.isAccuracyModeEnabled()).toBe(false);

      // Phase 3: Complete accuracy mode
      service.enable('query_intent_analysis');
      expect(service.isAccuracyModeEnabled()).toBe(true);
    });

    it('should support A/B testing scenarios', () => {
      // Simulate A/B test where some features are enabled
      const isUserInExperimentGroup = true;

      if (isUserInExperimentGroup) {
        service.enable('strict_archimate_parsing');
        service.enable('precise_response_validation');
      }

      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);
      expect(service.isEnabled('query_intent_analysis')).toBe(false);
      expect(service.isAccuracyModeEnabled()).toBe(false);
    });

    it('should support feature rollback', () => {
      service.enableAccuracyImprovements();
      expect(service.isAccuracyModeEnabled()).toBe(true);

      // Rollback due to issues
      service.disable('precise_response_validation');
      expect(service.isAccuracyModeEnabled()).toBe(false);

      // Individual features still work
      expect(service.isEnabled('strict_archimate_parsing')).toBe(true);
      expect(service.isEnabled('query_intent_analysis')).toBe(true);
    });
  });

  describe('Environment Handling', () => {
    it('should prioritize environment variables over defaults', () => {
      process.env.ENABLE_STRICT_PARSING = 'true';

      const envService = new FeatureFlagsService();

      expect(envService.isEnabled('strict_archimate_parsing')).toBe(true);

      // Programmatic disable should override env
      envService.disable('strict_archimate_parsing');
      expect(envService.isEnabled('strict_archimate_parsing')).toBe(false);
    });

    it('should handle string boolean conversion correctly', () => {
      const testCases = [
        { env: 'true', expected: true },
        { env: 'false', expected: false },
        { env: 'TRUE', expected: false }, // Should be case sensitive
        { env: '1', expected: false },    // Should be exact string match
        { env: '', expected: false },
        { env: undefined, expected: false }
      ];

      testCases.forEach(({ env, expected }) => {
        process.env.ENABLE_STRICT_PARSING = env;
        const testService = new FeatureFlagsService();
        expect(testService.isEnabled('strict_archimate_parsing')).toBe(expected);
      });
    });
  });
});