import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prescriptionsApi, patientsApi } from '../../services';
import { MagnifyingGlassIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['medicine-search', searchQuery, selectedPatient],
    queryFn: () => prescriptionsApi.searchMedicines(searchQuery, selectedPatient || undefined),
    enabled: searchQuery.length >= 2,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medicine Search</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Search your entire medical history for specific medicines
        </p>
      </div>

      {/* Search Box */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a medicine (e.g., Paracetamol, Amoxicillin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-12 text-lg py-4"
              autoFocus
            />
          </div>
          <select
            value={selectedPatient || ''}
            onChange={(e) => setSelectedPatient(e.target.value ? parseInt(e.target.value) : null)}
            className="input md:w-48"
          >
            <option value="">All Patients</option>
            {patientsData?.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-gray-500 mt-2">Type at least 2 characters to search</p>
        )}
      </div>

      {/* Search Results */}
      {isLoading && searchQuery.length >= 2 && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      {searchResults && searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Found {searchResults.length} result(s) for "{searchQuery}"
          </h2>
          <div className="grid gap-4">
            {searchResults.map((result, idx) => (
              <div key={idx} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-primary-600 dark:text-primary-400">
                      {result.medicine.name}
                    </h3>
                    {result.medicine.dosage && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Dosage: <span className="font-medium">{result.medicine.dosage}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm">
                      {result.medicine.frequency && (
                        <span className="badge badge-primary">{result.medicine.frequency}</span>
                      )}
                      {result.medicine.timing && (
                        <span className="badge badge-secondary">{result.medicine.timing}</span>
                      )}
                      {result.medicine.duration_days && (
                        <span className="badge">{result.medicine.duration_days} days</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/patients/${result.patient_id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    View Patient
                  </Link>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {result.patient_name}
                  </div>
                  {result.prescription_date && (
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(new Date(result.prescription_date), 'MMMM d, yyyy')}
                    </div>
                  )}
                  {result.doctor_name && (
                    <div>
                      Doctor: {result.doctor_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchQuery.length >= 2 && !isLoading && searchResults && searchResults.length === 0 && (
        <div className="card p-12 text-center">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No results found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn't find any medicines matching "{searchQuery}".
            <br />
            Try a different search term or check the spelling.
          </p>
        </div>
      )}

      {searchQuery.length === 0 && (
        <div className="card p-12 text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Search Your Medical History
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Enter a medicine name to find all instances across your prescriptions.
            This helps you track when you've been prescribed certain medications.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
