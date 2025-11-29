import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { patientsApi, documentsApi, prescriptionsApi } from '../../services';
import {
  UsersIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  const { data: documentsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const { data: prescriptionsData } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => prescriptionsApi.list(),
  });

  const stats = [
    {
      name: 'Total Patients',
      value: patientsData?.total || 0,
      icon: UsersIcon,
      href: '/patients',
      color: 'bg-blue-500',
    },
    {
      name: 'Documents',
      value: documentsData?.total || 0,
      icon: DocumentTextIcon,
      href: '/documents',
      color: 'bg-green-500',
    },
    {
      name: 'Prescriptions',
      value: prescriptionsData?.total || 0,
      icon: ClipboardDocumentListIcon,
      href: '/prescriptions',
      color: 'bg-purple-500',
    },
  ];

  const recentPrescriptions = prescriptionsData?.prescriptions?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your medical history management
          </p>
        </div>
        <Link to="/patients" className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Patient
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/patients"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <UsersIcon className="w-8 h-8 text-primary-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  Add Patient
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a new profile
                </p>
              </div>
            </Link>
            <Link
              to="/documents"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <DocumentTextIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  Upload Document
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add prescription/report
                </p>
              </div>
            </Link>
            <Link
              to="/search"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  Search Medicines
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Find past prescriptions
                </p>
              </div>
            </Link>
            <Link
              to="/settings"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  Settings
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure API key
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Prescriptions
          </h2>
          <Link
            to="/prescriptions"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View all
          </Link>
        </div>
        <div className="card-body">
          {recentPrescriptions.length > 0 ? (
            <div className="space-y-4">
              {recentPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {prescription.doctor_name || 'Unknown Doctor'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {prescription.hospital_name || 'Unknown Hospital'} •{' '}
                      {prescription.prescription_date || 'Date unknown'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {prescription.medicines.length} medicine(s)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`badge ${
                        prescription.parsing_status === 'success'
                          ? 'badge-success'
                          : prescription.parsing_status === 'partial'
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                    >
                      {prescription.parsing_status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No prescriptions yet. Upload a document to get started.
              </p>
              <Link to="/documents" className="btn btn-primary mt-4">
                Upload Document
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
