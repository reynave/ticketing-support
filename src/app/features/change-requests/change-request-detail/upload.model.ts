export interface UploadedFile {
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  url: string;
}

export interface UploadResponse {
  success: boolean;
  data: UploadedFile[];
}