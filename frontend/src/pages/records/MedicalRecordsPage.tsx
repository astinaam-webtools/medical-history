import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { documentsApi, patientsApi } from '../../services';
import DocumentViewer from '../../components/DocumentViewer';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  DocumentTextIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  EyeIcon,
  ChevronDownIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';
import type { Document, Medicine } from '../../types';

// Date range presets
type DatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom';

const datePresets: { value: DatePreset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

// Document type configuration
const documentTypes = [
  { value: 'prescription', label: 'Prescriptions', icon: ClipboardDocumentListIcon, color: 'text-blue-500' },
  { value: 'lab_report', label: 'Lab Reports', icon: BeakerIcon, color: 'text-green-500' },
  { value: 'imaging', label: 'X-Ray / MRI / CT', icon: PhotoIcon, color: 'text-purple-500' },
  { value: 'medical_record', label: 'Medical Records', icon: DocumentTextIcon, color: 'text-orange-500' },
];

const MedicalRecordsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['prescription', 'lab_report', 'imaging', 'medical_record']);
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  
  // Document viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  // Fetch all documents
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', { patient_id: selectedPatient }],
    queryFn: () => documentsApi.list(selectedPatient ? { patient_id: selectedPatient } : undefined),
  });

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (datePreset) {
      case 'this_month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
      case 'last_6_months':
        return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
      case 'this_year':
        return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) };
      case 'all_time':
        return { from: subYears(now, 100), to: now };
      case 'custom':
        return {
          from: customDateFrom ? parseISO(customDateFrom) : subYears(now, 100),
          to: customDateTo ? parseISO(customDateTo) : now,
        };
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [datePreset, customDateFrom, customDateTo]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!documentsData?.documents) return [];

    return documentsData.documents
      .filter((doc) => {
        // Filter by selected types
        if (!selectedTypes.includes(doc.document_type || 'prescription')) {
          return false;
        }

        // Filter by date range
        const docDate = parseISO(doc.upload_date);
        if (!isWithinInterval(docDate, { start: dateRange.from, end: dateRange.to })) {
          return false;
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const displayName = (doc.display_name || doc.file_name).toLowerCase();
          const doctorName = doc.prescription?.doctor_name?.toLowerCase() || '';
          const diagnosis = doc.prescription?.diagnosis?.toLowerCase() || '';
          const medicines = doc.prescription?.medicines?.map(m => m.name.toLowerCase()).join(' ') || '';
          
          if (!displayName.includes(query) && 
              !doctorName.includes(query) && 
              !diagnosis.includes(query) &&
              !medicines.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
  }, [documentsData, selectedTypes, dateRange, searchQuery]);

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const formatFrequency = (medicine: Medicine) => {
    if (medicine.frequency) return medicine.frequency;
    const times = [];
    if (medicine.morning) times.push('Morning');
    if (medicine.afternoon) times.push('Afternoon');
    if (medicine.evening) times.push('Evening');
    if (medicine.night) times.push('Night');
    return times.length > 0 ? times.join(', ') : 'As directed';
  };

  const getDocumentIcon = (docType: string | null) => {
    const config = documentTypes.find(t => t.value === docType) || documentTypes[0];
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  const getDocumentTypeLabel = (docType: string | null) => {
    const config = documentTypes.find(t => t.value === docType);
    return config?.label || 'Document';
  };

  const openDocumentViewer = (doc: Document) => {
    setViewingDocument(doc);
    setViewerOpen(true);
  };

  const getDocumentFileUrl = (docId: number) => {
    return documentsApi.getFileUrl(docId);
  };

  const getDocDisplayName = (doc: Document) => {
    return doc.display_name || doc.file_name;
  };

  // Get patient name helper
  const getPatientName = (patientId: number) => {
    const patient = patientsData?.patients.find(p => p.id === patientId);
    return patient?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Records</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all prescriptions, lab reports, X-rays, and medical documents
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col space-y-4">
          {/* Top Row: Search and Quick Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by document name, doctor, diagnosis, medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>

            {/* Patient Filter */}
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
              className="input w-full md:w-48"
            >
              <option value="">All Patients</option>
              {patientsData?.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>

            {/* Date Range Dropdown */}
            <div className="relative">
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                className="input w-full md:w-48 appearance-none"
              >
                {datePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterPopup(true)}
              className="btn btn-secondary flex items-center"
            >
              <FunnelIcon className="w-5 h-5 mr-2" />
              Filters
              {selectedTypes.length < 4 && (
                <span className="ml-2 bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
                  {selectedTypes.length}
                </span>
              )}
            </button>
          </div>

          {/* Document Type Pills */}
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => {
              const isSelected = selectedTypes.includes(type.value);
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => toggleTypeFilter(type.value)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-1.5 ${isSelected ? type.color : ''}`} />
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range (shown when custom is selected) */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Custom Range:</span>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="input"
                placeholder="From"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="input"
                placeholder="To"
              />
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredDocuments.length}</span>
          {' '}records found
          {datePreset !== 'all_time' && (
            <span className="ml-2 text-gray-500">
              • {datePresets.find(p => p.value === datePreset)?.label}
            </span>
          )}
        </p>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedRecord(expandedRecord === doc.id ? null : doc.id)}
              >
                {/* Mobile: Stack layout, Desktop: Side by side */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                      {getDocumentIcon(doc.document_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white break-words">
                          {getDocDisplayName(doc)}
                        </h3>
                        <span className="badge badge-primary text-xs flex-shrink-0">
                          {getDocumentTypeLabel(doc.document_type)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {format(new Date(doc.upload_date), 'MMM d, yyyy')}
                        </span>
                        <span>Patient: {getPatientName(doc.patient_id)}</span>
                        {doc.prescription?.doctor_name && (
                          <span>Dr. {doc.prescription.doctor_name}</span>
                        )}
                        {doc.prescription?.medicines && doc.prescription.medicines.length > 0 && (
                          <span>{doc.prescription.medicines.length} medicine(s)</span>
                        )}
                      </div>
                      {doc.prescription?.diagnosis && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Diagnosis:</span> {doc.prescription.diagnosis}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Action buttons - always visible */}
                  <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-start">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDocumentViewer(doc);
                      }}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="View Document"
                    >
                      <EyeIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedRecord === doc.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedRecord === doc.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                  <div className="pt-4 space-y-4">
                    {/* Prescription Details */}
                    {doc.prescription && (
                      <>
                        {/* Doctor Info */}
                        {(doc.prescription.doctor_name || doc.prescription.hospital_name) && (
                          <div className="flex flex-wrap gap-6">
                            {doc.prescription.doctor_name && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Doctor</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.prescription.doctor_name}
                                  {doc.prescription.doctor_speciality && (
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                      ({doc.prescription.doctor_speciality})
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            {doc.prescription.hospital_name && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hospital/Clinic</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.prescription.hospital_name}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Medicines */}
                        {doc.prescription.medicines && doc.prescription.medicines.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Medicines
                            </span>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {doc.prescription.medicines.map((medicine) => (
                                <div
                                  key={medicine.id}
                                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {medicine.name}
                                    {medicine.dosage && (
                                      <span className="text-primary-600 dark:text-primary-400 ml-2">
                                        {medicine.dosage}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {formatFrequency(medicine)}
                                    {medicine.duration_days && ` • ${medicine.duration_days} days`}
                                  </p>
                                  {medicine.instructions && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      {medicine.instructions}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prescription Notes */}
                        {doc.prescription.notes && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Notes
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {doc.prescription.notes}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Medical Report Details */}
                    {doc.medical_report && (
                      <>
                        {(doc.medical_report.lab_name || doc.medical_report.referring_doctor) && (
                          <div className="flex flex-wrap gap-6">
                            {doc.medical_report.lab_name && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lab/Facility</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.medical_report.lab_name}
                                </p>
                              </div>
                            )}
                            {doc.medical_report.referring_doctor && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Referring Doctor</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.medical_report.referring_doctor}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {doc.medical_report.findings && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Findings
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">
                              {doc.medical_report.findings}
                            </p>
                          </div>
                        )}

                        {doc.medical_report.conclusion && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Conclusion
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {doc.medical_report.conclusion}
                            </p>
                          </div>
                        )}

                        {doc.medical_report.recommendations && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Recommendations
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {doc.medical_report.recommendations}
                            </p>
                          </div>
                        )}

                        {doc.medical_report.summary && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Summary
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {doc.medical_report.summary}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Fallback for documents without parsed data */}
                    {!doc.prescription && !doc.medical_report && (
                      <div className="flex flex-wrap gap-6">
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Name</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {doc.file_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Type</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {doc.file_type?.toUpperCase() || 'Unknown'}
                          </p>
                        </div>
                        {doc.file_size && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">File Size</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(doc.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        )}
                        {doc.notes && (
                          <div className="w-full">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</span>
                            <p className="text-gray-700 dark:text-gray-300 mt-1">
                              {doc.notes}
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic w-full">
                          Click the eye icon to view the document
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No records found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || selectedTypes.length < 4 || datePreset !== 'all_time'
                ? 'Try adjusting your filters or search query'
                : 'Upload your first medical document to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Filter Popup Modal */}
      {showFilterPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFilterPopup(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filter Records
              </h3>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Document Types */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Document Types
              </label>
              <div className="space-y-2">
                {documentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.value}
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type.value)}
                        onChange={() => toggleTypeFilter(type.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <Icon className={`w-5 h-5 ml-3 ${type.color}`} />
                      <span className="ml-2 text-gray-900 dark:text-white">{type.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Date Range
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                className="input w-full"
              >
                {datePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {datePreset === 'custom' && (
                <div className="mt-3 flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTypes(['prescription', 'lab_report', 'imaging', 'medical_record']);
                  setDatePreset('this_month');
                  setCustomDateFrom('');
                  setCustomDateTo('');
                }}
                className="btn btn-secondary flex-1"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterPopup(false)}
                className="btn btn-primary flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

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

export default MedicalRecordsPage;
