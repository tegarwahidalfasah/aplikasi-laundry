// Test untuk sanitasi XSS pada validation module
import { validateCreateOrder } from '../validation';

describe('XSS Sanitization Tests', () => {
  const baseOrder = {
    customerName: 'Test User',
    serviceType: 'Cuci Lipat',
    weight: 2,
  };

  describe('Customer Name Sanitization', () => {
    it('should remove script tags from name', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: '<script>alert("xss")</script>John Doe',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).not.toContain('<script>');
        expect(result.value.customerName).not.toContain('</script>');
        expect(result.value.customerName).toContain('John Doe');
      }
    });

    it('should remove event handlers from name', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: 'John<img src=x onerror=alert(1)>Doe',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).not.toContain('onerror');
        expect(result.value.customerName).not.toContain('<img');
      }
    });

    it('should remove javascript protocol from name', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: 'javascript:alert("xss")',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).not.toContain('javascript:');
      }
    });

    it('should remove all HTML tags from name', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: '<div><p>John Doe</p></div>',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).toBe('John Doe');
        expect(result.value.customerName).not.toContain('<');
        expect(result.value.customerName).not.toContain('>');
      }
    });
  });

  describe('Notes Field Sanitization', () => {
    it('should remove script tags from notes', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        notes: '<script>malicious()</script>Cuci yang bersih ya',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notes).not.toContain('<script>');
        expect(result.value.notes?.toLowerCase()).not.toContain('malicious');
        expect(result.value.notes).toContain('Cuci yang bersih ya');
      }
    });

    it('should remove event handlers from notes', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        notes: 'Jangan lupa <img onerror=alert(1) src=x>',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notes).not.toContain('onerror');
        expect(result.value.notes).toContain('Jangan lupa');
      }
    });

    it('should truncate long notes after sanitization', () => {
      const longMaliciousNote = '<script>alert("xss")</script>' + 'a'.repeat(250);
      const result = validateCreateOrder({
        ...baseOrder,
        notes: longMaliciousNote,
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notes?.length).toBeLessThanOrEqual(200);
        expect(result.value.notes).not.toContain('<script>');
      }
    });

    it('should handle empty notes after sanitization', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        notes: '<script></script>   ',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Notes should be empty string or undefined after sanitization
        expect(result.value.notes?.length || 0).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Combined Attack Vectors', () => {
    it('should handle multiple XSS attempts in both fields', () => {
      const result = validateCreateOrder({
        customerName: '<script>x</script>Admin<iframe src="evil.com">',
        serviceType: 'Cuci Lipat',
        weight: 2,
        notes: '<script>steal()</script>Baju putih<script>cookie()</script>',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Name should be sanitized
        expect(result.value.customerName).not.toContain('<');
        expect(result.value.customerName).not.toContain('>');
        
        // Notes should be sanitized
        expect(result.value.notes).not.toContain('<script>');
        expect(result.value.notes?.includes('Baju putih')).toBe(true);
      }
    });

    it('should handle encoded XSS attempts', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: '&lt;script&gt;alert(1)&lt;/script&gt;Test',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // HTML entities will remain but tags are removed
        expect(result.value.customerName).not.toContain('<script>');
      }
    });

    it('should handle nested script tags', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: '<<script>nested</script>script>Test',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).not.toContain('<script>');
        expect(result.value.customerName).toContain('Test');
      }
    });
  });

  describe('SQL Injection Prevention (via input sanitization)', () => {
    it('should handle SQL injection in name field', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: "John'; DROP TABLE orders; --",
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        // String is kept but application should use parameterized queries
        expect(result.value.customerName).toContain("DROP");
        // Sanitasi tidak menghapus SQL, tapi aplikasi harus pakai prepared statements
      }
    });

    it('should handle UNION-based SQL injection', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        notes: "Normal note' UNION SELECT * FROM users --",
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.notes).toContain('UNION');
        // Lagi-lagi, pencegahan SQL injection ada di database layer
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null bytes', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: 'Test\u0000User',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).toBeTruthy();
      }
    });

    it('should handle unicode characters', () => {
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: '用户测试🎉',
      });
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.customerName).toBe('用户测试🎉');
      }
    });

    it('should handle very long strings before sanitization', () => {
      const veryLongName = 'a'.repeat(500) + '<script>x</script>';
      const result = validateCreateOrder({
        ...baseOrder,
        customerName: veryLongName,
      });
      
      expect(result.ok).toBe(false); // Should fail max length validation
      if (!result.ok) {
        expect(result.error).toContain('maks');
      }
    });
  });
});
