// Ambient type augmentation for Request.json()
declare global {
  interface Request {
    json(): Promise<any>;
  }
}

export {};
