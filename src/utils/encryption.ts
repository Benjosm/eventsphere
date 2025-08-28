/// <reference lib="dom" />
import { EventCategory } from '../EventStore';

/**
 * Represents the sensitive event fields that need encryption
 */
export interface SensitiveEventData {
  title: string;
  category: EventCategory;
}

/**
 * Represents encrypted event data with initialization vector
 */
export interface EncryptedEventData {
  iv: ArrayBuffer;
  data: ArrayBuffer;
}

/**
 * Securely encrypts sensitive event data using AES-GCM
 * @param data The sensitive event data to encrypt (title and category)
 * @param key The cryptographic key (must allow 'encrypt' usage)
 * @returns Encrypted data containing initialization vector and ciphertext
 * @throws {Error} When encryption fails due to invalid parameters or key
 */
export async function encryptEvent(
  data: SensitiveEventData,
  key: CryptoKey
): Promise<EncryptedEventData> {
  try {
    // Convert sensitive data to JSON string
    const encoder = new TextEncoder();
    const eventData = JSON.stringify(data);
    const eventDataBuffer = encoder.encode(eventData);

    // Generate a secure random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt using AES-GCM (128-bit tag length)
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      eventDataBuffer
    );

    return {
      iv: iv.buffer,
      data: encryptedBuffer,
    };
  } catch (error) {
    console.error('Sensitive event data encryption failed:', error);
    throw new Error('Failed to encrypt sensitive event data: ' + (error as Error).message);
  }
}

/**
 * Decrypts encrypted sensitive event data back to the original structure
 * @param encryptedData The encrypted data containing IV and ciphertext
 * @param key The cryptographic key (must allow 'decrypt' usage)
 * @returns The original sensitive event data (title and category)
 * @throws {Error} When decryption fails due to invalid data, key, or tampering
 */
export async function decryptEvent(
  encryptedData: EncryptedEventData,
  key: CryptoKey
): Promise<SensitiveEventData> {
  try {
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encryptedData.iv),
        tagLength: 128,
      },
      key,
      encryptedData.data
    );

    // Convert back to sensitive data object
    const decoder = new TextDecoder();
    const eventData = decoder.decode(decryptedBuffer);
    const data = JSON.parse(eventData);

    // Validate data structure
    if (!data.title || !data.category) {
      throw new Error('Decrypted data is missing required sensitive fields');
    }

    return {
      title: data.title,
      category: data.category as EventCategory
    };
  } catch (error) {
    console.error('Event decryption failed:', error);
    if ((error as Error).message.includes('authentication failure')) {
      throw new Error('Decryption failed: data may be corrupted or tampered with');
    }
    throw new Error('Failed to decrypt event data: ' + (error as Error).message);
  }
}
