import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
    ArrowLeft, Save, Globe, Image as ImageIcon, X,
    Upload, Tag, FileText, Eye, Loader2, Check
} from 'lucide-react';
import { blogService, uploadService } from '../services/api';

const QUILL_MODULES = {
    toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
    ],
    clipboard: { matchVisual: false }
};

const QUILL_FORMATS = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'indent', 'align',
    'blockquote', 'code-block', 'link', 'image', 'video'
];

export default function BlogEditor() {
    const { id } = useParams();
    const isEditing = Boolean(id);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [featuredImage, setFeaturedImage] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [status, setStatus] = useState('draft');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isEditing) loadBlog();
        loadTags();
    }, [id]);

    const loadBlog = async () => {
        try {
            setLoading(true);
            const res = await blogService.getBlog(id);
            const blog = res.data.blog;
            setTitle(blog.title || '');
            setContent(blog.content || '');
            setExcerpt(blog.excerpt || '');
            setMetaDescription(blog.meta_description || '');
            setFeaturedImage(blog.featured_image || '');
            setSelectedTags(blog.tags || []);
            setStatus(blog.status || 'draft');
        } catch (err) {
            setError('Failed to load blog post');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTags = async () => {
        try {
            const res = await blogService.getTags();
            setAvailableTags(res.data.tags || []);
        } catch { }
    };

    const showSaveMessage = (msg) => {
        setSaveMessage(msg);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleSave = async (publishStatus = null) => {
        if (!title.trim()) { setError('Title is required'); return; }
        if (!content.trim() || content === '<p><br></p>') { setError('Content is required'); return; }

        const finalStatus = publishStatus || status;
        const isPublishing = finalStatus === 'published';

        try {
            if (isPublishing) setPublishing(true);
            else setSaving(true);
            setError('');

            const payload = {
                title: title.trim(), content, excerpt: excerpt.trim(),
                featured_image: featuredImage, status: finalStatus,
                meta_description: metaDescription.trim(), tags: selectedTags
            };

            let res;
            if (isEditing) {
                res = await blogService.updateBlog(id, payload);
            } else {
                res = await blogService.createBlog(payload);
            }

            setStatus(finalStatus);
            showSaveMessage(isPublishing ? '✅ Published!' : '✅ Saved!');

            if (!isEditing && res.data.blog?.id) {
                navigate(`/blogs/edit/${res.data.blog.id}`, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
            console.error(err);
        } finally {
            setSaving(false);
            setPublishing(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingImage(true);
            setError('');
            const res = await uploadService.uploadImage(file);
            setFeaturedImage(res.data.url);
        } catch (err) {
            setError('Image upload failed — please check FTP settings');
            console.error(err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleAddTag = (tagName) => {
        const trimmed = tagName.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags([...selectedTags, trimmed]);
        }
        setTagInput('');
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };

    const removeTag = (tag) => setSelectedTags(selectedTags.filter(t => t !== tag));

    const filteredSuggestions = tagInput.trim()
        ? availableTags.filter(t =>
            t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
            !selectedTags.includes(t.name)
        )
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
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
                    {saveMessage && (
                        <span className="text-emerald-400 text-sm font-medium flex items-center animate-fade-in">
                            <Check className="h-4 w-4 mr-1" />
                            {saveMessage}
                        </span>
                    )}

                    {isEditing && (
                        <button
                            onClick={() => navigate(`/blogs/preview/${id}`)}
                            className="flex items-center px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm transition-colors"
                        >
                            <Eye className="h-4 w-4 mr-1.5" /> Preview
                        </button>
                    )}

                    <button
                        onClick={() => handleSave('draft')}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Save Draft
                    </button>

                    <button
                        onClick={() => handleSave('published')}
                        disabled={publishing}
                        className="btn-gradient flex items-center text-sm disabled:opacity-50"
                    >
                        {publishing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
                        Publish
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between animate-fade-in">
                    <span className="text-red-300 text-sm">{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Editor — 2 cols */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Title */}
                    <div className="card-dark p-6">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter your blog title..."
                            className="w-full text-2xl font-bold text-white bg-transparent border-none outline-none placeholder-slate-500"
                        />
                    </div>

                    {/* Rich Editor */}
                    <div className="card-dark overflow-hidden blog-editor">
                        <ReactQuill
                            value={content}
                            onChange={setContent}
                            modules={QUILL_MODULES}
                            formats={QUILL_FORMATS}
                            placeholder="Start writing your blog post..."
                            theme="snow"
                        />
                    </div>
                </div>

                {/* Sidebar — 1 col */}
                <div className="space-y-6">
                    {/* Status indicator */}
                    <div className="card-dark p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === 'published'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                }`}>
                                {status === 'published' ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>

                    {/* Featured Image */}
                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2 text-indigo-400" />
                            Featured Image
                        </h3>

                        {featuredImage ? (
                            <div className="relative rounded-lg overflow-hidden">
                                <img src={featuredImage} alt="Featured" className="w-full h-40 object-cover rounded-lg" />
                                <button
                                    onClick={() => setFeaturedImage('')}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600/90 rounded-full hover:bg-red-700 transition-colors"
                                >
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-600/50 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                            >
                                {uploadingImage ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-2" />
                                        <span className="text-sm text-slate-400">Uploading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">Click to upload</p>
                                        <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP (max 10MB)</p>
                                    </>
                                )}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        <input
                            type="text"
                            value={featuredImage}
                            onChange={(e) => setFeaturedImage(e.target.value)}
                            placeholder="Or paste image URL..."
                            className="input-dark text-xs"
                        />
                    </div>

                    {/* Tags */}
                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-violet-400" />
                            Tags
                        </h3>

                        {selectedTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedTags.map((tag, i) => (
                                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/15 text-indigo-300 text-xs rounded-full border border-indigo-500/25">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-200">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="Add tags (press Enter)..."
                                className="input-dark text-sm"
                            />

                            {filteredSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-32 overflow-y-auto">
                                    {filteredSuggestions.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleAddTag(tag.name)}
                                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Excerpt */}
                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-emerald-400" />
                            Excerpt
                        </h3>
                        <textarea
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            rows={3}
                            placeholder="Brief summary of the post..."
                            className="input-dark text-sm resize-none"
                        />
                    </div>

                    {/* Meta Description */}
                    <div className="card-dark p-4 space-y-3">
                        <h3 className="text-sm font-semibold text-white flex items-center">
                            <Globe className="h-4 w-4 mr-2 text-amber-400" />
                            SEO Meta Description
                        </h3>
                        <textarea
                            value={metaDescription}
                            onChange={(e) => setMetaDescription(e.target.value)}
                            rows={2}
                            maxLength={160}
                            placeholder="SEO-friendly description (max 160 chars)..."
                            className="input-dark text-sm resize-none"
                        />
                        <p className="text-xs text-slate-500 text-right">{metaDescription.length}/160</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
