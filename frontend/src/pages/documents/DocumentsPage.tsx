import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { patientsApi, documentsApi } from '../../services';
import DocumentViewer from '../../components/DocumentViewer';
import {
  CloudArrowUpIcon,
  CameraIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { Document } from '../../types';

const DocumentsPage = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [searchParams] = useSearchParams();

  // Get patient_id from URL params (for auto-select from patient page)
  const patientIdFromUrl = searchParams.get('patient_id');

  const [selectedPatient, setSelectedPatient] = useState<number | null>(
    patientIdFromUrl ? parseInt(patientIdFromUrl) : null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [documentType, setDocumentType] = useState('prescription');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
  // Display name fields
  const [displayName, setDisplayName] = useState('');
  const [generateDisplayName, setGenerateDisplayName] = useState(true);
  
  // Document viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  // Update selected patient when URL param changes
  useEffect(() => {
    if (patientIdFromUrl) {
      setSelectedPatient(parseInt(patientIdFromUrl));
    }
  }, [patientIdFromUrl]);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', { patient_id: selectedPatient }],
    queryFn: () => documentsApi.list(selectedPatient ? { patient_id: selectedPatient } : undefined),
  });

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setUploadStatus('success');
      setSelectedFile(null);
      setPreviewUrl(null);
      setDisplayName('');
      setTimeout(() => setUploadStatus('idle'), 3000);
    },
    onError: () => {
      setUploadStatus('error');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStatus('idle');
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
        }
      }, 'image/jpeg', 0.95);
      stopCamera();
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedPatient) {
      alert('Please select a patient and a file');
      return;
    }

    setUploadStatus('uploading');
    uploadMutation.mutate({
      file: selectedFile,
      patientId: selectedPatient,
      documentType,
      displayName: displayName || undefined,
      generateDisplayName,
    });
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStatus('idle');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const openDocumentViewer = (doc: Document) => {
    setViewingDocument(doc);
    setViewerOpen(true);
  };

  const getDocumentFileUrl = (docId: number) => {
    return documentsApi.getFileUrl(docId);
  };

  // Get display name or fall back to file name
  const getDocDisplayName = (doc: Document) => {
    return doc.display_name || doc.file_name;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload prescriptions and medical records for AI-powered parsing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h2>

          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Patient
            </label>
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
              className="input w-full"
            >
              <option value="">Choose a patient...</option>
              {patientsData?.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} {patient.relationship ? `(${patient.relationship})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="input w-full"
            >
              <option value="prescription">Prescription</option>
              <option value="lab_report">Lab Report</option>
              <option value="medical_record">Medical Record</option>
              <option value="imaging">Imaging (X-Ray, MRI, etc.)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Display Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Dr. Smith Cardiology Visit"
              className="input w-full"
            />
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="generateDisplayName"
                checked={generateDisplayName}
                onChange={(e) => setGenerateDisplayName(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="generateDisplayName" className="ml-2 flex items-center text-sm text-gray-600 dark:text-gray-400">
                <SparklesIcon className="w-4 h-4 mr-1 text-primary-500" />
                Auto-generate name with AI
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {displayName 
                ? 'Your custom name will be used' 
                : generateDisplayName 
                  ? 'AI will suggest a descriptive name based on content'
                  : 'Original file name will be shown'}
            </p>
          </div>

          {/* Camera / Upload Area */}
          {showCamera ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                <button onClick={capturePhoto} className="btn btn-primary">
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture
                </button>
                <button onClick={stopCamera} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-500 transition-colors"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  {selectedFile?.type === 'application/pdf' ? (
                    <div className="flex items-center justify-center">
                      <DocumentTextIcon className="w-16 h-16 text-primary-500" />
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedFile?.name}</p>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Drag and drop a file here, or click to browse
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary"
                    >
                      Browse Files
                    </button>
                    <button onClick={startCamera} className="btn btn-secondary">
                      <CameraIcon className="w-5 h-5 mr-2" />
                      Camera
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Supports: JPG, PNG, PDF (max 10MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedPatient || uploadStatus === 'uploading'}
            className="btn btn-primary w-full"
          >
            {uploadStatus === 'uploading' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing with AI...
              </>
            ) : uploadStatus === 'success' ? (
              <>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                Uploaded Successfully!
              </>
            ) : uploadStatus === 'error' ? (
              <>
                <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                Upload Failed - Try Again
              </>
            ) : (
              'Upload & Parse Document'
            )}
          </button>
        </div>

        {/* Recent Documents */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Documents</h2>
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
              className="input input-sm w-40"
            >
              <option value="">All patients</option>
              {patientsData?.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
          <div className="card-body max-h-[500px] overflow-y-auto">
            {documentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : documentsData?.documents && documentsData.documents.length > 0 ? (
              <div className="space-y-3">
                {documentsData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded">
                        <DocumentTextIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {getDocDisplayName(doc)}
                        </p>
                        {doc.display_name && doc.display_name !== doc.file_name && (
                          <p className="text-xs text-gray-400 truncate">
                            {doc.file_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.document_type?.replace('_', ' ')} • {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {doc.prescription && (
                        <span className={`badge ${
                          doc.prescription.parsing_status === 'success' ? 'badge-success' :
                          doc.prescription.parsing_status === 'partial' ? 'badge-warning' : 'badge-error'
                        }`}>
                          {doc.prescription.parsing_status}
                        </span>
                      )}
                      <button
                        onClick={() => openDocumentViewer(doc)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <EyeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No documents found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewingDocument(null);
          }}
          fileUrl={getDocumentFileUrl(viewingDocument.id)}
          fileName={getDocDisplayName(viewingDocument)}
          fileType={viewingDocument.file_type === 'pdf' ? 'pdf' : 'image'}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
