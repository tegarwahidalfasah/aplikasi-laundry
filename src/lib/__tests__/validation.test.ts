// Unit tests untuk validasi input dan logika bisnis
import { normalizePhoneNumber, validateCreateOrder, validateOrderId, validateStatus } from '../validation';
import { ORDER_STATUSES } from '../catalog';

describe('Validation Module', () => {
  describe('normalizePhoneNumber', () => {
    it('should return null for empty/undefined input', () => {
      expect(normalizePhoneNumber(null)).toEqual({ ok: true, value: null });
      expect(normalizePhoneNumber(undefined)).toEqual({ ok: true, value: null });
      expect(normalizePhoneNumber('')).toEqual({ ok: true, value: null });
      expect(normalizePhoneNumber('   ')).toEqual({ ok: true, value: null });
    });

    it('should normalize Indonesian phone numbers starting with 0', () => {
      expect(normalizePhoneNumber('08123456789')).toEqual({ ok: true, value: '628123456789' });
      expect(normalizePhoneNumber('0812-3456-789')).toEqual({ ok: true, value: '628123456789' });
      expect(normalizePhoneNumber('0812 3456 789')).toEqual({ ok: true, value: '628123456789' });
    });

    it('should normalize numbers starting with 8', () => {
      expect(normalizePhoneNumber('8123456789')).toEqual({ ok: true, value: '628123456789' });
    });

    it('should normalize numbers starting with +62', () => {
      expect(normalizePhoneNumber('+628123456789')).toEqual({ ok: true, value: '628123456789' });
      expect(normalizePhoneNumber('628123456789')).toEqual({ ok: true, value: '628123456789' });
    });

    it('should handle 620 prefix', () => {
      expect(normalizePhoneNumber('6208123456789')).toEqual({ ok: true, value: '628123456789' });
    });

    it('should reject invalid phone numbers', () => {
      const result = normalizePhoneNumber('12345');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('tidak valid');
      }
    });

    it('should reject numbers that are too short or long', () => {
      expect(normalizePhoneNumber('0123456').ok).toBe(false);
      expect(normalizePhoneNumber('08123456789012345').ok).toBe(false);
    });
  });

  describe('validateCreateOrder', () => {
    it('should reject non-object body', () => {
      expect(validateCreateOrder(null).ok).toBe(false);
      expect(validateCreateOrder([]).ok).toBe(false);
      expect(validateCreateOrder('string').ok).toBe(false);
      expect(validateCreateOrder(123).ok).toBe(false);
    });

    it('should reject empty customer name', () => {
      const result = validateCreateOrder({ customerName: '', serviceType: 'Cuci Lipat', weight: 1 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Nama pelanggan');
      }
    });

    it('should reject customer name that is too long', () => {
      const longName = 'a'.repeat(81);
      const result = validateCreateOrder({ customerName: longName, serviceType: 'Cuci Lipat', weight: 1 });
      expect(result.ok).toBe(false);
    });

    it('should accept valid order with minimal fields', () => {
      const result = validateCreateOrder({
        customerName: 'John Doe',
        serviceType: 'Cuci Lipat',
        weight: 2.5,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).toBe('John Doe');
        expect(result.value.serviceType).toBe('Cuci Lipat');
        expect(result.value.weight).toBe(2.5);
        expect(result.value.pricePerKg).toBe(7000);
        expect(result.value.totalPrice).toBe(17500);
        expect(result.value.discount).toBe(0);
      }
    });

    it('should calculate total price correctly', () => {
      const result = validateCreateOrder({
        customerName: 'Jane',
        serviceType: 'Cuci Setrika',
        weight: 3,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pricePerKg).toBe(9000);
        expect(result.value.totalPrice).toBe(27000);
      }
    });

    it('should apply discount correctly', () => {
      const result = validateCreateOrder({
        customerName: 'Jane',
        serviceType: 'Cuci Lipat',
        weight: 2,
        discount: 10,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pricePerKg).toBe(7000);
        expect(result.value.totalPrice).toBe(12600); // 14000 * 0.9
      }
    });

    it('should reject invalid discount values', () => {
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 1, discount: -5 }).ok).toBe(false);
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 1, discount: 105 }).ok).toBe(false);
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 1, discount: 'abc' }).ok).toBe(false);
    });

    it('should sanitize notes field', () => {
      const longNotes = 'a'.repeat(250);
      const result = validateCreateOrder({
        customerName: 'Test',
        serviceType: 'Cuci Lipat',
        weight: 1,
        notes: longNotes,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notes?.length).toBeLessThanOrEqual(200);
      }
    });

    it('should reject invalid service type', () => {
      const result = validateCreateOrder({
        customerName: 'Test',
        serviceType: 'Invalid Service',
        weight: 1,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('tidak dikenal');
      }
    });

    it('should reject invalid weight', () => {
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 0 }).ok).toBe(false);
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: -1 }).ok).toBe(false);
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 150 }).ok).toBe(false);
      expect(validateCreateOrder({ customerName: 'Test', serviceType: 'Cuci Lipat', weight: 'abc' }).ok).toBe(false);
    });

    it('should round weight to 1 decimal place', () => {
      const result = validateCreateOrder({
        customerName: 'Test',
        serviceType: 'Cuci Lipat',
        weight: 2.55,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.weight).toBe(2.6);
      }
    });
  });

  describe('validateOrderId', () => {
    it('should accept valid positive integer IDs', () => {
      expect(validateOrderId(1)).toEqual({ ok: true, value: 1 });
      expect(validateOrderId(100)).toEqual({ ok: true, value: 100 });
      expect(validateOrderId('100')).toEqual({ ok: true, value: 100 });
    });

    it('should reject non-positive IDs', () => {
      expect(validateOrderId(0).ok).toBe(false);
      expect(validateOrderId(-1).ok).toBe(false);
      expect(validateOrderId(null).ok).toBe(false);
      expect(validateOrderId(undefined).ok).toBe(false);
      expect(validateOrderId('abc').ok).toBe(false);
    });
  });

  describe('validateStatus', () => {
    it('should accept valid statuses', () => {
      ORDER_STATUSES.forEach((status) => {
        expect(validateStatus(status)).toEqual({ ok: true, value: status });
      });
    });

    it('should reject invalid statuses', () => {
      expect(validateStatus('Invalid').ok).toBe(false);
      expect(validateStatus('').ok).toBe(false);
      expect(validateStatus(null).ok).toBe(false);
      expect(validateStatus(123).ok).toBe(false);
    });
  });
});
