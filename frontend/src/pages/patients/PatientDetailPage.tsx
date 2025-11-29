import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientsApi, documentsApi } from '../../services';
import DocumentViewer from '../../components/DocumentViewer';
import { ArrowLeftIcon, DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { Document } from '../../types';

const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const patientId = parseInt(id || '0');
  
  // Document viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.get(patientId),
    enabled: !!patientId,
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', { patient_id: patientId }],
    queryFn: () => documentsApi.list({ patient_id: patientId }),
    enabled: !!patientId,
  });

  const openDocumentViewer = (doc: Document) => {
    setViewingDocument(doc);
    setViewerOpen(true);
  };

  const closeDocumentViewer = () => {
    setViewerOpen(false);
    setViewingDocument(null);
  };

  if (patientLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Patient not found</p>
        <Link to="/patients" className="btn btn-primary mt-4">
          Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/patients" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{patient.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {patient.relationship || 'Patient'} • {patient.document_count} documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Patient Information
          </h2>
          <div className="space-y-3">
            {patient.date_of_birth && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(patient.date_of_birth), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            {patient.gender && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Gender</span>
                <p className="font-medium text-gray-900 dark:text-white">{patient.gender}</p>
              </div>
            )}
            {patient.blood_group && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Blood Group</span>
                <p className="font-medium text-gray-900 dark:text-white">{patient.blood_group}</p>
              </div>
            )}
            {patient.allergies && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Allergies</span>
                <p className="font-medium text-gray-900 dark:text-white">{patient.allergies}</p>
              </div>
            )}
            {patient.chronic_conditions && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Chronic Conditions</span>
                <p className="font-medium text-gray-900 dark:text-white">{patient.chronic_conditions}</p>
              </div>
            )}
            {patient.emergency_contact && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Emergency Contact</span>
                <p className="font-medium text-gray-900 dark:text-white">{patient.emergency_contact}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
            <Link to={`/documents?patient_id=${patientId}`} className="btn btn-primary btn-sm">
              Upload Document
            </Link>
          </div>
          <div className="card-body">
            {documentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : documentsData?.documents && documentsData.documents.length > 0 ? (
              <div className="space-y-4">
                {documentsData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg flex-shrink-0">
                        <DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white break-words">
                          {doc.display_name || doc.file_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {doc.document_type} • {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                        </p>
                        {doc.prescription && (
                          <p className="text-sm text-primary-600 dark:text-primary-400">
                            {doc.prescription.doctor_name || 'Doctor'} - {doc.prescription.medicines.length} medicine(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => openDocumentViewer(doc)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <EyeIcon className="w-5 h-5 text-gray-500" />
                      </button>
                      {doc.prescription && (
                        <span className={`badge ${
                          doc.prescription.parsing_status === 'success' ? 'badge-success' :
                          doc.prescription.parsing_status === 'partial' ? 'badge-warning' : 'badge-error'
                        }`}>
                          {doc.prescription.parsing_status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No documents uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={closeDocumentViewer}
          fileUrl={documentsApi.getFileUrl(viewingDocument.id)}
          fileName={viewingDocument.display_name || viewingDocument.file_name}
          fileType={viewingDocument.file_type === 'pdf' ? 'pdf' : 'image'}
        />
      )}
    </div>
  );
};

export default PatientDetailPage;
