import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { prescriptionsApi, patientsApi } from '../../services';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import type { Medicine } from '../../types';

const PrescriptionsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedPrescription, setExpandedPrescription] = useState<number | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  const { data: prescriptionsData, isLoading } = useQuery({
    queryKey: ['prescriptions', { 
      search: searchQuery, 
      patient_id: selectedPatient,
      date_from: dateFrom,
      date_to: dateTo 
    }],
    queryFn: () => prescriptionsApi.list({
      search: searchQuery || undefined,
      patient_id: selectedPatient || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['medicine-search', searchQuery],
    queryFn: () => prescriptionsApi.searchMedicines(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const formatFrequency = (medicine: Medicine) => {
    if (medicine.frequency) return medicine.frequency;
    const times = [];
    if (medicine.morning) times.push('Morning');
    if (medicine.afternoon) times.push('Afternoon');
    if (medicine.evening) times.push('Evening');
    if (medicine.night) times.push('Night');
    return times.length > 0 ? times.join(', ') : 'As directed';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prescriptions</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search and view all parsed prescriptions
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medicines, doctors, hospitals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
              className="input"
            >
              <option value="">All Patients</option>
              {patientsData?.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
            />
            <input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Medicine Search Results */}
      {searchQuery.length >= 2 && searchResults && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <FunnelIcon className="w-4 h-4 mr-2" />
            Medicine Search Results
          </h3>
          {searchLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {searchResults.map((result, idx) => (
                <span key={idx} className="badge badge-primary">
                  {result.medicine.name} - {result.medicine.dosage}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No medicines found</p>
          )}
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : prescriptionsData?.prescriptions && prescriptionsData.prescriptions.length > 0 ? (
          prescriptionsData.prescriptions.map((prescription) => (
            <div key={prescription.id} className="card">
              <div
                className="card-header cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setExpandedPrescription(
                  expandedPrescription === prescription.id ? null : prescription.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {prescription.doctor_name || 'Unknown Doctor'}
                      {prescription.doctor_speciality && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({prescription.doctor_speciality})
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {prescription.hospital_name || 'Hospital not specified'} •{' '}
                      {prescription.prescription_date 
                        ? format(new Date(prescription.prescription_date), 'MMMM d, yyyy')
                        : 'Date unknown'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {prescription.medicines.length} medicine(s)
                    </span>
                    <span className={`badge ${
                      prescription.parsing_status === 'success' ? 'badge-success' :
                      prescription.parsing_status === 'partial' ? 'badge-warning' : 'badge-error'
                    }`}>
                      {prescription.parsing_status}
                    </span>
                  </div>
                </div>
              </div>

              {expandedPrescription === prescription.id && (
                <div className="card-body border-t border-gray-100 dark:border-gray-700">
                  {/* Doctor Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {prescription.doctor_name && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Doctor</span>
                        <p className="text-gray-900 dark:text-white">{prescription.doctor_name}</p>
                        {prescription.doctor_title && (
                          <p className="text-sm text-gray-500">{prescription.doctor_title}</p>
                        )}
                      </div>
                    )}
                    {prescription.hospital_name && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Hospital</span>
                        <p className="text-gray-900 dark:text-white">{prescription.hospital_name}</p>
                        {prescription.hospital_address && (
                          <p className="text-sm text-gray-500">{prescription.hospital_address}</p>
                        )}
                      </div>
                    )}
                    {prescription.diagnosis && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Diagnosis</span>
                        <p className="text-gray-900 dark:text-white">{prescription.diagnosis}</p>
                      </div>
                    )}
                  </div>

                  {/* Medicines Table */}
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Medicines
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-2">Medicine</th>
                          <th className="pb-2">Dosage</th>
                          <th className="pb-2">Frequency</th>
                          <th className="pb-2">When</th>
                          <th className="pb-2">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescription.medicines.map((medicine) => (
                          <tr key={medicine.id} className="border-b border-gray-50 dark:border-gray-700">
                            <td className="py-3">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {medicine.name}
                              </span>
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-400">
                              {medicine.dosage || '-'}
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-400">
                              {formatFrequency(medicine)}
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-400">
                              {medicine.timing || '-'}
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-400">
                              {medicine.duration_days ? `${medicine.duration_days} days` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes */}
                  {prescription.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <span className="text-xs text-yellow-700 dark:text-yellow-400 uppercase font-medium">
                        Notes
                      </span>
                      <p className="text-gray-900 dark:text-white mt-1">{prescription.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No prescriptions found</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload documents to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionsPage;
