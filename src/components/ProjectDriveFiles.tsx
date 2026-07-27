import React, { useState, useEffect } from 'react';
import { uploadFileToProject, listProjectFiles, deleteFile, DriveFile } from '../lib/drive-service';
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/google-auth';
import { Cloud, Upload, Trash2, File as FileIcon, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

export function ProjectDriveFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();
      if (token) setNeedsAuth(false);
    }
    checkAuth();
    
    const unsubscribe = initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!needsAuth && projectId) {
      loadFiles();
    }
  }, [needsAuth, projectId]);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listProjectFiles(projectId);
      setFiles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: 'fornecido' | 'elaborado') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      await uploadFileToProject(projectId, file, category);
      await loadFiles();
    } catch (err: any) {
      alert("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
      // clear input
      if (e.target) e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Certeza que deseja deletar este arquivo permanentemente do Google Drive?")) return;
    setLoading(true);
    try {
      await deleteFile(fileId);
      await loadFiles();
    } catch (err: any) {
      alert("Erro ao deletar: " + err.message);
      setLoading(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
        <Cloud className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-white font-medium mb-1">Integração com Google Drive</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-sm mx-auto">
          Armazene e organize os arquivos deste projeto (plantas, ARTs, documentos) diretamente no Google Drive.
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 font-medium px-4 py-2 rounded shadow mx-auto transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Conectar com Google
        </button>
      </div>
    );
  }

  const fornecidos = files.filter(f => f.appProperties?.category === 'fornecido' || !f.appProperties?.category); // Default older files to 'fornecido'
  const elaborados = files.filter(f => f.appProperties?.category === 'elaborado');

  const renderFileList = (title: string, list: DriveFile[], category: 'fornecido' | 'elaborado') => (
    <div className="flex-1 min-w-[300px]">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</h4>
        <label className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors border border-blue-500/20">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>Adicionar</span>
          <input type="file" className="hidden" onChange={(e) => handleUpload(e, category)} disabled={uploading} />
        </label>
      </div>

      {list.length === 0 ? (
         <div className="py-6 text-center border-2 border-dashed border-zinc-800 rounded">
           <p className="text-zinc-500 text-xs">Nenhum arquivo nesta categoria.</p>
         </div>
      ) : (
        <div className="space-y-2">
          {list.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 lg:p-3 bg-zinc-950 border border-zinc-800 rounded hover:bg-zinc-900/80 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <img src={file.iconLink || ''} alt="" className="w-4 h-4 flex-shrink-0" />
                <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-sm text-zinc-300 hover:text-blue-400 truncate">
                  {file.name}
                </a>
              </div>
              <div className="flex items-center gap-1 lg:gap-2 pl-2">
                 <a 
                  href={file.webViewLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                  title="Abrir no Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button 
                  onClick={() => handleDelete(file.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Deletar arquivo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 lg:p-5">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-400" />
          Arquivos do Projeto (Google Drive)
        </h3>
        <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-300">Desconectar</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded mb-4 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-zinc-500 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Carregando arquivos...</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
           {renderFileList('Entregues pelo Cliente', fornecidos, 'fornecido')}
           <div className="hidden lg:block w-px bg-zinc-800"></div>
           {renderFileList('Minhas Entregas', elaborados, 'elaborado')}
        </div>
      )}
    </div>
  );
}
