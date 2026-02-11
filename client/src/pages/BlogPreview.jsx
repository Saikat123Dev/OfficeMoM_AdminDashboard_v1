import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Edit3, Globe, Clock, Tag, User,
    Calendar, FileLock
} from 'lucide-react';
import { blogService } from '../services/api';

export default function BlogPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBlog();
    }, [id]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            const res = await blogService.getBlog(id);
            setBlog(res.data.blog);
        } catch (err) {
            console.error('Error loading blog:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!blog) return;
        const newStatus = blog.status === 'published' ? 'draft' : 'published';
        try {
            await blogService.updateStatus(id, newStatus);
            setBlog({ ...blog, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-white mb-2">Blog not found</h3>
                <button onClick={() => navigate('/blogs')} className="text-indigo-400 hover:text-indigo-300 text-sm">
                    ← Back to Posts
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/blogs')}
                    className="flex items-center text-slate-400 hover:text-white transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Posts
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggleStatus}
                        className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${blog.status === 'published'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                    >
                        {blog.status === 'published' ? (
                            <><FileLock className="h-4 w-4 mr-1.5" /> Unpublish</>
                        ) : (
                            <><Globe className="h-4 w-4 mr-1.5" /> Publish</>
                        )}
                    </button>

                    <button
                        onClick={() => navigate(`/blogs/edit/${id}`)}
                        className="btn-gradient flex items-center text-sm"
                    >
                        <Edit3 className="h-4 w-4 mr-1.5" /> Edit Post
                    </button>
                </div>
            </div>

            {/* Preview Card */}
            <article className="card-dark overflow-hidden">
                {/* Featured Image */}
                {blog.featured_image && (
                    <div className="relative">
                        <img
                            src={blog.featured_image}
                            alt={blog.title}
                            className="w-full h-64 sm:h-80 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    </div>
                )}

                <div className="p-6 sm:p-8 space-y-6">
                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${blog.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            }`}>
                            {blog.status === 'published' ? '● Published' : '● Draft'}
                        </span>

                        {blog.published_at && blog.status === 'published' && (
                            <span className="text-xs text-slate-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Published {new Date(blog.published_at).toLocaleDateString('en-US', {
                                    month: 'long', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                        {blog.title}
                    </h1>

                    {/* Excerpt */}
                    {blog.excerpt && (
                        <p className="text-lg text-slate-400 leading-relaxed border-l-4 border-indigo-500/50 pl-4">
                            {blog.excerpt}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(blog.updated_at).toLocaleDateString('en-US', {
                                month: 'long', day: 'numeric', year: 'numeric'
                            })}
                        </span>
                        <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Admin
                        </span>
                    </div>

                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {blog.tags.map((tag, i) => (
                                <span
                                    key={i}
                                    className="flex items-center px-3 py-1.5 bg-indigo-500/10 text-indigo-300 text-sm rounded-full border border-indigo-500/20"
                                >
                                    <Tag className="h-3 w-3 mr-1.5" />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="border-slate-700/50" />

                    {/* Content */}
                    <div
                        className="blog-content prose prose-invert prose-lg max-w-none"
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />

                    {/* Meta Description (SEO) */}
                    {blog.meta_description && (
                        <div className="mt-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/40">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                                <Globe className="h-3 w-3 mr-1" />
                                SEO Meta Description
                            </h4>
                            <p className="text-sm text-slate-300">{blog.meta_description}</p>
                        </div>
                    )}
                </div>
            </article>
        </div>
    );
}
