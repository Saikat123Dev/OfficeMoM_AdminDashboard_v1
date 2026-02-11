import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, Trash2, FileText, Calendar, Tag, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { blogService } from '../services/api';

/* ========== Sub-Components ========== */

const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status === 'published'
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
        }`}>
        {status === 'published' ? 'Published' : 'Draft'}
    </span>
);

const BlogCard = ({ blog, onEdit, onPreview, onDelete, onToggleStatus }) => (
    <div className="card-dark overflow-hidden hover:border-slate-600/50 transition-all duration-300 hover:scale-[1.01] group">
        {/* Featured Image */}
        {blog.featured_image ? (
            <div className="h-48 bg-slate-800/50 overflow-hidden">
                <img
                    src={blog.featured_image}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </div>
        ) : (
            <div className="h-48 bg-gradient-to-br from-slate-800/50 to-slate-700/30 flex items-center justify-center">
                <FileText className="h-12 w-12 text-slate-600" />
            </div>
        )}

        {/* Content */}
        <div className="p-5">
            <div className="flex items-start justify-between mb-3">
                <StatusBadge status={blog.status} />
                <div className="flex items-center text-xs text-slate-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(blog.created_at).toLocaleDateString()}
                </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">
                {blog.title}
            </h3>

            {blog.excerpt && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">{blog.excerpt}</p>
            )}

            {/* Tags */}
            {blog.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {blog.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/15">
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {tag}
                        </span>
                    ))}
                    {blog.tags.length > 3 && (
                        <span className="text-[11px] text-slate-500">+{blog.tags.length - 3}</span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                <div className="flex space-x-1">
                    <button
                        onClick={() => onEdit(blog.id)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPreview(blog.id)}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Preview"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDelete(blog)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
                <button
                    onClick={() => onToggleStatus(blog)}
                    className={`p-2 rounded-lg transition-colors ${blog.status === 'published'
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'
                        }`}
                    title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                >
                    {blog.status === 'published' ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
            </div>
        </div>
    </div>
);

const DeleteModal = ({ blog, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-sm p-6 animate-scale-in">
            <div className="text-center">
                <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="h-7 w-7 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Delete Blog Post</h3>
                <p className="text-sm text-slate-400 mb-6">
                    Are you sure you want to delete "<span className="text-white font-medium">{blog?.title}</span>"? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                    <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={onConfirm} className="btn-danger flex-1 flex items-center justify-center gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
);

/* ========== Main Blogs Component ========== */

export default function Blogs() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadBlogs();
    }, [currentPage, search, statusFilter]);

    const loadBlogs = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: 9, search };
            if (statusFilter !== 'all') params.status = statusFilter;
            const response = await blogService.getBlogs(params);
            setBlogs(response.data.blogs || []);
            setPagination(response.data.pagination || {});
        } catch (error) {
            console.error('Error loading blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (blog) => {
        try {
            const newStatus = blog.status === 'published' ? 'draft' : 'published';
            await blogService.updateStatus(blog.id, newStatus);
            loadBlogs();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await blogService.deleteBlog(deleteTarget.id);
            setDeleteTarget(null);
            loadBlogs();
        } catch (error) {
            console.error('Error deleting blog:', error);
        }
    };

    const tabs = [
        { key: 'all', label: 'All Posts' },
        { key: 'published', label: 'Published' },
        { key: 'draft', label: 'Drafts' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <FileText className="h-5 w-5 text-emerald-400" />
                        </div>
                        Blog Posts
                    </h1>
                    <p className="text-slate-400 mt-1 ml-12">Manage your blog content</p>
                </div>
                <button
                    onClick={() => navigate('/blogs/new')}
                    className="btn-gradient mt-4 sm:mt-0 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> New Post
                </button>
            </div>

            {/* Filters */}
            <div className="card-dark p-4 space-y-4">
                {/* Status Tabs */}
                <div className="flex space-x-1 bg-slate-800/30 rounded-xl p-1 w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === tab.key
                                    ? 'bg-indigo-500/15 text-indigo-400'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search blog posts..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="input-dark pl-10"
                    />
                </div>
            </div>

            {/* Blog Grid */}
            {loading ? (
                <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                </div>
            ) : blogs.length === 0 ? (
                <div className="card-dark p-12 text-center">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg font-medium">No blog posts found</p>
                    <p className="text-slate-600 text-sm mt-1">Create your first blog post to get started</p>
                    <button onClick={() => navigate('/blogs/new')} className="btn-gradient mt-4 inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" /> New Post
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {blogs.map(blog => (
                            <BlogCard
                                key={blog.id}
                                blog={blog}
                                onEdit={(id) => navigate(`/blogs/edit/${id}`)}
                                onPreview={(id) => navigate(`/blogs/preview/${id}`)}
                                onDelete={(blog) => setDeleteTarget(blog)}
                                onToggleStatus={handleToggleStatus}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="card-dark p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-400">
                                    Page <span className="text-white font-medium">{pagination.currentPage}</span> of <span className="text-white font-medium">{pagination.totalPages}</span>
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPrev}
                                        className="p-2 border border-slate-600/50 rounded-xl text-slate-300 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={!pagination.hasNext}
                                        className="p-2 border border-slate-600/50 rounded-xl text-slate-300 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <DeleteModal
                    blog={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
