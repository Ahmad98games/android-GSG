/**
 * GOLD SHE MESH — Worker Pool Types
 */

export interface WorkerTask {
  id: string;
  type: 'DECRYPT_JSON' | 'DECRYPT_PROTO' | 'LOG_BINARY';
  payload: Buffer | string;
  secret: string;
  metadata?: any;
}

export interface WorkerResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}