import { getAccessToken } from './google-auth';

// Helper to handle Drive API requests
const fetchDrive = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Drive API Error");
  }

  return res.status !== 204 ? res.json() : null;
};

// Find or create a folder for the project
export const getOrCreateProjectFolder = async (projectId: string): Promise<string> => {
  const folderName = `Projeto - ${projectId}`;
  
  // Search for the folder
  const searchParams = new URLSearchParams({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  try {
    const data = await fetchDrive(`/files?${searchParams.toString()}`);
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create if not exists
    const createData = await fetchDrive('/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      })
    });
    
    return createData.id;
  } catch (error) {
    console.error("Error ensuring project folder", error);
    throw error;
  }
};

// Upload a file to the project's folder
export const uploadFileToProject = async (projectId: string, file: File, category: 'fornecido' | 'elaborado'): Promise<any> => {
  const folderId = await getOrCreateProjectFolder(projectId);
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const metadata = {
    name: file.name,
    parents: [folderId],
    appProperties: {
       category: category
    }
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Upload failed");
  }

  return res.json();
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  appProperties?: {
    category?: string;
  };
}

// List all files in the project folder
export const listProjectFiles = async (projectId: string): Promise<DriveFile[]> => {
  try {
    const folderId = await getOrCreateProjectFolder(projectId);
    const searchParams = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, iconLink, appProperties)',
      orderBy: 'createdTime desc'
    });

    const data = await fetchDrive(`/files?${searchParams.toString()}`);
    return data.files || [];
  } catch (error) {
    console.error("Error listing project files", error);
    return [];
  }
};

// Delete a file
export const deleteFile = async (fileId: string) => {
  await fetchDrive(`/files/${fileId}`, { method: 'DELETE' });
};
