/**
 * Shared memory-crypto module.
 *
 * Application-layer AES-256-GCM field-level encryption for user_memory content,
 * implemented with Web Crypto (available in the Deno edge runtime). Extracted
 * from memory-crud so every writer (memory-crud, extract-user-context) shares a
 * single encryption implementation keyed off MEMORY_ENCRYPTION_KEY.
 *
 * Contract (kept byte-for-byte identical to the original memory-crud impl so
 * any rows already written by memory-crud continue to decrypt):
 *   - The key is derived from the MEMORY_ENCRYPTION_KEY secret, padded/sliced to
 *     exactly 32 bytes (AES-256). The published dev-key fallback is retained ONLY
 *     so the module never throws in a misconfigured environment; in production the
 *     real 32-char secret MUST be set (it now is).
 *   - encrypt(text) returns { ciphertext, iv } as base64 strings.
 *   - decrypt(ciphertext, iv) reverses it; decrypt(encrypt(x)) === x for the same key.
 *   - Callers store JSON.stringify({ ciphertext, iv }) in user_memory.encrypted_content
 *     with encryption_version: 1 (unchanged from the original shape).
 *
 * Note: the encrypted payload is field-level defense-in-depth, NOT full at-rest
 * encryption. The plaintext fact_value / fact_context shadow is still stored
 * alongside the ciphertext for display and search. Removing that plaintext shadow
 * (true at-rest) is a larger read-path refactor and is a noted follow-up, out of
 * scope for this change.
 */

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = Deno.env.get('MEMORY_ENCRYPTION_KEY') || 'default-dev-key-change-in-prod-32ch';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32));

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(text: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decrypt(ciphertext: string, iv: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();

    const encryptedData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      key,
      encryptedData
    );

    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption failed]';
  }
}

/**
 * Convenience helper for the common case: encrypt the {fact_value, fact_context}
 * pair into the exact serialized shape stored in user_memory.encrypted_content.
 * Mirrors the inline shape memory-crud and extract-user-context both use.
 */
export async function encryptFactContent(
  factValue: string,
  factContext: string | null | undefined,
): Promise<string> {
  const contentToEncrypt = JSON.stringify({ fact_value: factValue, fact_context: factContext || '' });
  const { ciphertext, iv } = await encrypt(contentToEncrypt);
  return JSON.stringify({ ciphertext, iv });
}
