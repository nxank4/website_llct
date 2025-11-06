'use client';

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('http://127.0.0.1:8000/api/v1/upload', { method: 'POST', body: form });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tải tài liệu</h1>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            {file ? (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{file.name}</div>
                <button onClick={() => setFile(null)} className="text-red-600 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300">Chọn file khác</button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto" />
                <label className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  Chọn file
                  <input type="file" className="hidden" onChange={onChange} />
                </label>
                <div className="text-xs text-gray-500 dark:text-gray-400">Hỗ trợ PDF, DOCX, TXT, PNG, JPG</div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              disabled={!file || uploading}
              onClick={onUpload}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Đang tải...' : 'Tải lên'}
            </button>
          </div>

          {result && (
            <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


