import { validateEvent, EventSchema } from '../validation';
import { ZodError } from 'zod';

// Mock console.error to verify logging behavior
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('EventSchema', () => {
  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  it('should validate a complete and correct event object', () => {
    const validEvent = {
      id: 'evt_123',
      timestamp: '2025-08-27T10:00:00.000Z',
      type: 'user.login',
      data: { userId: 'user_123', ipAddress: '192.168.1.1' },
    };
  
    const result = validateEvent(validEvent);
    
    expect(result).toEqual(validEvent);
  });

  it('should reject an event object with missing id', () => {
    const invalidEvent = {
      timestamp: '2025-08-27T10:00:00.000Z',
      type: 'user.login',
      data: { userId: 'user_123' },
    };

    expect(() => validateEvent(invalidEvent)).toThrow(ZodError);
    // Verify error is logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Validation failed:', expect.any(String));
  });

  it('should reject an event object with invalid timestamp format', () => {
    const invalidEvent = {
      id: 'evt_123',
      timestamp: 'not-a-timestamp',
      type: 'user.login',
      data: { userId: 'user_123' },
    };

    expect(() => validateEvent(invalidEvent)).toThrow(ZodError);
    // Verify error is logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Validation failed:', expect.any(String));
  });

  it('should reject an event object with extra unknown fields', () => {
    const invalidEvent = {
      id: 'evt_123',
      timestamp: '2025-08-27T10:00:00.000Z',
      type: 'user.login',
      data: { userId: 'user_123' },
      extraField: 'notAllowed',
    };

    expect(() => validateEvent(invalidEvent)).toThrow(ZodError);
    // Verify error is logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Validation failed:', expect.any(String));
  });

  it('should reject an event object with type not being a string', () => {
    const invalidEvent = {
      id: 'evt_123',
      timestamp: '2025-08-27T10:00:00.000Z',
      // @ts-ignore - testing invalid type
      type: 123,
      data: { userId: 'user_123' },
    };

    expect(() => validateEvent(invalidEvent)).toThrow(ZodError);
    // Verify error is logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Validation failed:', expect.any(String));
  });
});

afterAll(() => {
  // Restore console.error
  consoleErrorSpy.mockRestore();
});
