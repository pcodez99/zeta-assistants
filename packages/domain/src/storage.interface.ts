export interface IStorageService {
  /**
   * Upload a file to the storage bucket.
   * @param key - Unique identifier/path for the file in the bucket.
   * @param body - File body (Buffer, Uint8Array, Blob, String, etc.).
   * @param contentType - MIME type of the file.
   * @returns Key of the uploaded file.
   */
  upload(key: string, body: any, contentType?: string): Promise<string>;

  /**
   * Fetch a file from the storage bucket.
   * @param key - Unique identifier/path of the file.
   * @returns Resolves with the object contents.
   */
  get(key: string): Promise<any>;

  /**
   * Generate a signed URL for temporary access to a private file.
   * @param key - Unique identifier/path of the file.
   * @param expiresIn - Expiration in seconds (default: 3600).
   * @returns Signed URL string.
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a file from the storage bucket.
   * @param key - Unique identifier/path of the file.
   */
  delete(key: string): Promise<void>;

  /**
   * Retrieve the public URL for an object (if publicly readable).
   * @param key - Unique identifier/path of the file.
   */
  getPublicUrl(key: string): string;
}
