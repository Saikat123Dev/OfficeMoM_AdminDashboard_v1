import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Trash2, Eye, Mail, User, Check, X, Users as UsersIcon } from 'lucide-react';
import { usersService } from '../services/api';

/* ========== Badge Components ========== */

const VerificationBadge = ({ verified }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${verified
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
      : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
    }`}>
    {verified ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
    {verified ? 'Verified' : 'Not Verified'}
  </span>
);

const SocialBadge = ({ isGoogle, isFacebook }) => {
  if (isGoogle) {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">Google</span>;
  }
  if (isFacebook) {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">Facebook</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/30">Email</span>;
};

/* ========== Main Component ========== */

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [currentPage, search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersService.getUsers({
        page: currentPage,
        limit: 10,
        search
      });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <UsersIcon className="h-5 w-5 text-indigo-400" />
            </div>
            Users Management
          </h1>
          <p className="text-slate-400 mt-1 ml-12">Manage all registered users</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card-dark p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark pl-10"
            />
          </div>
          <button className="px-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 flex items-center gap-2 transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Registration</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-indigo-500/10">
                            {user.profilePic ? (
                              <img className="h-10 w-10 rounded-xl object-cover" src={user.profilePic} alt="" />
                            ) : (
                              <User className="h-5 w-5 text-indigo-400" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.fullName || 'No Name'}</div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1.5">
                          <VerificationBadge verified={user.isVerified} />
                          <SocialBadge isGoogle={user.isGoogleUser} isFacebook={user.isFacebookUser} />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          <button className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing page <span className="text-white font-medium">{pagination.currentPage}</span> of <span className="text-white font-medium">{pagination.totalPages}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}