import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientsApi } from '../../services';
import { PlusIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Patient, PatientCreate } from '../../types';

const PatientsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientCreate>({
    name: '',
    relationship: 'self',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient created successfully');
      setShowModal(false);
      setFormData({ name: '', relationship: 'self' });
    },
    onError: () => {
      toast.error('Failed to create patient');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: patientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient deleted');
    },
    onError: () => {
      toast.error('Failed to delete patient');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (patient: Patient) => {
    if (window.confirm(`Are you sure you want to delete ${patient.name}?`)) {
      deleteMutation.mutate(patient.id);
    }
  };

  const relationships = ['self', 'spouse', 'child', 'parent', 'sibling', 'other'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage patient profiles for your family
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Patient
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : data?.patients && data.patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.patients.map((patient) => (
            <div key={patient.id} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <Link to={`/patients/${patient.id}`} className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {patient.relationship || 'Not specified'}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(patient)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {patient.blood_group && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Blood:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.blood_group}
                      </span>
                    </div>
                  )}
                  {patient.gender && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Gender:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.gender}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {patient.document_count} document(s)
                  </span>
                  <Link
                    to={`/patients/${patient.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No patients yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your first patient profile to get started
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Patient
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Add New Patient
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <label className="label">Relationship</label>
                  <select
                    className="input"
                    value={formData.relationship || ''}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  >
                    {relationships.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel.charAt(0).toUpperCase() + rel.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Gender</label>
                    <select
                      className="input"
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select</option>
                      {genders.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select
                      className="input"
                      value={formData.blood_group || ''}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    >
                      <option value="">Select</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Allergies</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={formData.allergies || ''}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="List any known allergies"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn btn-primary flex-1"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Patient'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
